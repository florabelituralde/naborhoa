import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Single Stripe webhook for the whole app. Two very different money flows land
// here on the same platform account, told apart by metadata.kind:
//   - platform_plan : the app's own subscription (HOA admin -> platform).
//                     Direct charge, no Connect. Promotes the community's plan.
//   - hoa_autopay   : a resident's recurring dues (Connect destination charge).
//                     Activates a Subscription row.
//   - (no kind)     : a one-time resident dues/invoice payment (Connect).
//                     Marks the Invoice paid.

// Marks a resident invoice paid and notifies them. Shared by the one-time
// checkout.session.completed and payment_intent.succeeded events. Best-effort
// (matches the original design): a missing invoice must not wedge Stripe into
// endlessly retrying, so failures are logged and swallowed here.
async function markInvoicePaidFromEvent(base44, obj) {
  const metadata = obj.metadata || {};
  const invoiceId = metadata.invoice_id;
  const communityId = metadata.community_id;
  if (!invoiceId) return;
  try {
    const inv = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (inv && inv.status !== "paid" && inv.status !== "confirmed") {
      await base44.asServiceRole.entities.Invoice.update(invoiceId, {
        status: "paid",
        paid_date: new Date().toISOString().split("T")[0],
        wix_checkout_id: obj.id || inv.wix_checkout_id, // column stores the Stripe session id
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

// Promotes a community's plan once its platform (app) subscription is paid.
// The granted plan is taken from THIS payment's own Stripe metadata (set
// server-side in create-plan-checkout, tamper-proof), never from the community's
// mutable pending_* fields — otherwise completing a cheap checkout could grant a
// more expensive plan that was staged afterward. DB errors are allowed to
// propagate so the outer handler returns non-2xx and Stripe retries; activation
// is idempotent, so retries are safe.
async function activatePlatformPlan(base44, stripe, obj) {
  const communityId = obj.metadata?.community_id;
  if (!communityId) return;
  const community = await base44.asServiceRole.entities.Community.get(communityId).catch(() => null);
  if (!community) return; // community gone -> nothing to grant, don't force retries

  const newSubId = obj.subscription || "";
  const planId = obj.metadata?.plan_id || community.pending_plan_id || null;
  const billingCycle = obj.metadata?.billing_cycle || community.pending_billing_cycle || null;
  const previousSubId = community.platform_subscription_id || "";

  await base44.asServiceRole.entities.Community.update(communityId, {
    subscription_status: "active",
    platform_subscription_id: newSubId,
    plan_id: planId,
    billing_cycle: billingCycle,
    pending_plan_id: null,
    pending_billing_cycle: null,
  });

  // A plan change opens a brand-new subscription; cancel the one it replaces so
  // the admin isn't billed twice. Best-effort: a failure here (e.g. already
  // canceled) must not undo the activation above or trigger endless retries.
  if (previousSubId && previousSubId !== newSubId) {
    try {
      await stripe.subscriptions.cancel(previousSubId);
    } catch (e) {
      console.error("stripe-webhook: failed to cancel superseded platform subscription", previousSubId, e?.message);
    }
  }
}

Deno.serve(async (req) => {
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
      // Connect account onboarding progress for an HOA's payout account.
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
    } else if (event.type === "checkout.session.completed") {
      const obj = event.data.object;
      const kind = obj.metadata?.kind || "";

      if (kind === "platform_plan") {
        // App subscription (HOA admin -> platform).
        await activatePlatformPlan(base44, stripe, obj);
      } else if (obj.mode === "subscription") {
        // Resident dues auto-pay (Connect).
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
      } else if (obj.payment_status === "paid") {
        // One-time resident invoice/dues payment (Connect). Only fulfill once
        // actually paid — a delayed method (ACH) completes the session before
        // settling, and is finalized later by payment_intent.succeeded.
        await markInvoicePaidFromEvent(base44, obj);
      }
    } else if (event.type === "payment_intent.succeeded") {
      await markInvoicePaidFromEvent(base44, event.data.object);
    } else if (event.type === "customer.subscription.deleted") {
      // A fully-deleted subscription may be either a resident auto-pay sub or a
      // platform plan sub — settle whichever it matches.
      const obj = event.data.object;
      try {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ subscription_id: obj.id });
        if (subs.length > 0) {
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: "canceled" });
        }
      } catch (e) {
        console.error("stripe-webhook: subscription cancel failed", e);
      }
      try {
        // "deleted" means the subscription has actually ended, so drop the
        // community to the Free tier ("ended"). "canceled" is reserved for a
        // still-paid-through-period grace state and keeps premium access.
        const comms = await base44.asServiceRole.entities.Community.filter({ platform_subscription_id: obj.id });
        if (comms.length > 0) {
          await base44.asServiceRole.entities.Community.update(comms[0].id, { subscription_status: "ended" });
        }
      } catch (e) {
        console.error("stripe-webhook: platform plan end failed", e);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("stripe-webhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
