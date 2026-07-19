import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

Deno.serve(withCors(async (req) => {
  const base44 = createClientFromRequest(req);
  const secretKey = Deno.env.get("Stripe_api_key");
  const webhookSecret = Deno.env.get("Stripe_webhook");

  if (!secretKey || !webhookSecret) {
    console.error("stripe-webhook: Stripe secrets not configured");
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const sig = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("stripe-webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "account.updated") {
      const acc = event.data.object;
      const communities = await base44.asServiceRole.entities.Community.filter({
        stripe_account_id: acc.id,
      });
      if (communities.length) {
        const c = communities[0];
        const status = acc.charges_enabled
          ? "enabled"
          : acc.details_submitted
          ? "pending"
          : "restricted";
        await base44.asServiceRole.entities.Community.update(c.id, {
          stripe_account_status: status,
          charges_enabled: !!acc.charges_enabled,
          payouts_enabled: !!acc.payouts_enabled,
          stripe_details_submitted: !!acc.details_submitted,
        });
      }
    } else if (event.type === "checkout.session.completed" && event.data.object.mode === "subscription") {
      const obj = event.data.object;
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ checkout_id: obj.id });
        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: "active",
            subscription_id: obj.subscription || "",
          });
        }
      } catch (e) {
        console.error("stripe-webhook: subscription activate failed", e);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const obj = event.data.object;
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ subscription_id: obj.id });
        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: "canceled" });
        }
      } catch (e) {
        console.error("stripe-webhook: subscription cancel failed", e);
      }
    } else if (
      event.type === "checkout.session.completed" ||
      event.type === "payment_intent.succeeded"
    ) {
      const obj = event.data.object;
      const metadata = obj.metadata || (obj.payment_intent && obj.metadata) || {};
      const invoiceId = metadata.invoice_id;
      const communityId = metadata.community_id;

      if (invoiceId) {
        try {
          const inv = await base44.asServiceRole.entities.Invoice.get(invoiceId);
          if (inv && inv.status !== "paid" && inv.status !== "confirmed") {
            await base44.asServiceRole.entities.Invoice.update(invoiceId, {
              status: "paid",
              paid_date: new Date().toISOString().split("T")[0],
              wix_checkout_id: obj.id || inv.wix_checkout_id,
            });
            if (communityId && inv.homeowner_id) {
              const amountTotal = (obj.amount_total || obj.amount || 0) / 100;
              await base44.asServiceRole.entities.Notification.create({
                community_id: communityId,
                user_id: inv.homeowner_id,
                type: "payment_confirmed",
                title: "Payment confirmed",
                body: `Your payment of $${amountTotal.toFixed(2)} has been confirmed.`,
                related_id: invoiceId,
              });
            }
          }
        } catch (e) {
          console.error("stripe-webhook: invoice update failed", e);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));