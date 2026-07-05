import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { subscription_id } = body;

    if (!subscription_id) {
      return Response.json({ error: "Missing subscription_id" }, { status: 400 });
    }

    const subs = await base44.asServiceRole.entities.Subscription.filter({ subscription_id, homeowner_id: user.id });
    if (subs.length === 0) {
      return Response.json({ error: "Subscription not found" }, { status: 404 });
    }

    const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    const response = await fetch(`https://www.wixapis.com/payments/base44/v1/subscriptions/${subscription_id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID,
      },
      body: JSON.stringify({
        subscription_id: subscription_id,
        immediate: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Cancel subscription error:", JSON.stringify(errorData));
      return Response.json({ error: "Failed to cancel subscription" }, { status: 500 });
    }

    const data = await response.json();
    await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
      status: data.subscription.status === "CANCELED" ? "canceled" : "active",
    });

    return Response.json({ status: data.subscription.status });
  } catch (error) {
    console.error("cancel-subscription error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});