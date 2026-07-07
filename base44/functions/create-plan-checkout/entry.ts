import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Plan pricing mirror (server-side source of truth to prevent tampering).
const PLANS: Record<string, { name: string; monthlyPrice: number }> = {
  starter: { name: "Nabor Starter", monthlyPrice: 19 },
  growth: { name: "Nabor Growth", monthlyPrice: 49 },
  pro: { name: "Nabor Pro", monthlyPrice: 99 },
};

const CYCLES: Record<string, { multiplier: number; discount: number; frequency: "MONTH" | "YEAR"; interval: number }> = {
  monthly: { multiplier: 1, discount: 0, frequency: "MONTH", interval: 1 },
  quarterly: { multiplier: 3, discount: 0.1, frequency: "MONTH", interval: 3 },
  annual: { multiplier: 12, discount: 0.2, frequency: "YEAR", interval: 1 },
};

function safeOrigin(req: Request): string {
  const raw = req.headers.get("Origin") || req.headers.get("origin") || "";
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return `${u.protocol}//${u.host}`;
    }
  } catch (_) { /* invalid or missing Origin */ }
  return "https://app.base44.app";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { community_id, plan_id, billing_cycle } = body;

    const plan = PLANS[plan_id];
    const cycle = CYCLES[billing_cycle];

    if (!community_id || !plan || !cycle) {
      return Response.json({ error: "Missing or invalid plan details" }, { status: 400 });
    }

    // Only an authenticated HOA admin who owns this community may change its
    // subscription plan / billing cycle.
    let caller;
    try {
      caller = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (caller?.role !== "hoa_admin" || caller?.community_id !== community_id) {
      return Response.json({ error: "Not authorized for this community" }, { status: 403 });
    }

    const gross = plan.monthlyPrice * cycle.multiplier;
    const amount = Math.round(gross * (1 - cycle.discount) * 100) / 100;

    if (amount < 0.50) {
      return Response.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const origin = safeOrigin(req);
    const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    const cycleLabel = billing_cycle.charAt(0).toUpperCase() + billing_cycle.slice(1);

    const item = {
      name: `${plan.name} — ${cycleLabel}`,
      quantity: 1,
      price: amount.toFixed(2),
      subscriptionInfo: {
        subscriptionSettings: {
          frequency: cycle.frequency,
          interval: cycle.interval,
        },
        title: `${plan.name} (${cycleLabel})`,
        description: `Nabor platform subscription — ${plan.name}, billed ${billing_cycle}`,
      },
    };

    const response = await fetch("https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID,
      },
      body: JSON.stringify({
        cart: { items: [item] },
        callbackUrls: {
          postFlowUrl: `${origin}/onboarding`,
          thankYouPageUrl: `${origin}/pay/thank-you?plan=1`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Wix plan checkout error:", response.status, JSON.stringify(data));
      return Response.json({ error: data?.details?.applicationError?.description || "Failed to create checkout" }, { status: 500 });
    }

    const checkoutId = data.checkoutSession.id;

    await base44.asServiceRole.entities.Community.update(community_id, {
      plan_id,
      billing_cycle,
      subscription_status: "pending",
      platform_checkout_id: checkoutId,
    });

    return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
  } catch (error) {
    console.error("create-plan-checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});