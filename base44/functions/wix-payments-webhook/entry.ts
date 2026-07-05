import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import jwt from 'npm:jsonwebtoken@9.0.2';

Deno.serve(async (req) => {
  try {
    const requestBody = await req.text();
    const WEBHOOK_PUBLIC_KEY = Deno.env.get("WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");

    if (!WEBHOOK_PUBLIC_KEY) {
      console.error("Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");
      return Response.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const rawPayload = jwt.verify(requestBody, WEBHOOK_PUBLIC_KEY, { algorithms: ["RS256"] });
    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);

    const base44 = createClientFromRequest(req);

    if (event.eventType === "wix.ecom.v1.order_approved") {
      const order = eventData.actionEvent.body.order;
      const checkoutId = order.checkoutId;
      const hasSubscription = order.lineItems.some(li => li.subscriptionInfo);

      if (hasSubscription) {
        const subs = await base44.asServiceRole.entities.Subscription.filter({ checkout_id: checkoutId });
        if (subs.length > 0) {
          const subId = order.lineItems.find(li => li.subscriptionInfo)?.subscriptionInfo?.id;
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            status: "active",
            subscription_id: subId || "",
            buyer_email: order.buyerInfo?.email || "",
          });
        }
      } else {
        const invs = await base44.asServiceRole.entities.Invoice.filter({ wix_checkout_id: checkoutId });
        if (invs.length > 0) {
          await base44.asServiceRole.entities.Invoice.update(invs[0].id, {
            status: "paid",
            paid_date: new Date().toISOString().split("T")[0],
            wix_order_id: order.id,
          });
        }
      }
    } else if (event.eventType === "wix.ecom.subscription_contracts.v1.subscription_contract_canceled" ||
               event.eventType === "wix.ecom.subscription_contracts.v1.subscription_contract_expired") {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const subscriptionId = subscriptionContract.id;

      const subs = await base44.asServiceRole.entities.Subscription.filter({ subscription_id: subscriptionId });
      if (subs.length > 0) {
        const newStatus = event.eventType.includes("canceled") ? "canceled" : "ended";
        await base44.asServiceRole.entities.Subscription.update(subs[0].id, { status: newStatus });
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});