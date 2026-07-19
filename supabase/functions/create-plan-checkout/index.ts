import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// Platform (app) subscription checkout — the HOA admin paying Naborhoa for a
// plan. This is a DIRECT charge on the platform's own Stripe account: there is
// NO Stripe Connect `transfer_data` and NO `application_fee`, so 100% of the
// subscription revenue stays with the platform. That is exactly what keeps this
// flow separate from homeowner dues (stripe-checkout / stripe-subscription-
// checkout), which are destination charges routed to each HOA's connected
// account. The shared stripe-webhook tells the two apart via metadata.kind.
//
// Replaces the previous Wix Payments Platform integration.

// Plan pricing mirror (server-side source of truth to prevent tampering).
const PLANS: Record<string, { name: string; monthlyPrice: number }> = {
  free: { name: "Nabor Free", monthlyPrice: 0 },
  starter: { name: "Nabor Community", monthlyPrice: 19 },
  growth: { name: "Nabor Essential", monthlyPrice: 49 },
  pro: { name: "Nabor Connected", monthlyPrice: 99 },
  pro_multi: { name: "Nabor Portfolio", monthlyPrice: 199 },
};

// Billing cycles map to a Stripe recurring interval. quarterly = every 3 months.
const CYCLES: Record<string, { multiplier: number; discount: number; interval: "month" | "year"; intervalCount: number }> = {
  monthly: { multiplier: 1, discount: 0, interval: "month", intervalCount: 1 },
  quarterly: { multiplier: 3, discount: 0.1, interval: "month", intervalCount: 3 },
  annual: { multiplier: 12, discount: 0.2, interval: "year", intervalCount: 1 },
};

function safeOrigin(req: Request): string {
  const raw = req.headers.get("Origin") || req.headers.get("origin") || "";
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return `${u.protocol}//${u.host}`;
    }
  } catch (_) { /* invalid or missing Origin */ }
  return Deno.env.get("APP_BASE_URL") || "https://naborhoa.com";
}

Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
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

    // Charge per billing period, computed server-side (never trust the client).
    const gross = plan.monthlyPrice * cycle.multiplier;
    const amount = Math.round(gross * (1 - cycle.discount) * 100) / 100;

    if (amount < 0.50) {
      // The free plan (and any $0 selection) never goes through checkout — the
      // frontend applies it directly.
      return Response.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const secretKey = Deno.env.get("Stripe_api_key");
    if (!secretKey) {
      return Response.json({ error: "Payments are not configured." }, { status: 503 });
    }

    const stripe = new Stripe(secretKey);
    const origin = safeOrigin(req);
    const cycleLabel = billing_cycle.charAt(0).toUpperCase() + billing_cycle.slice(1);
    const unitAmount = Math.round(amount * 100);

    const planMeta = { kind: "platform_plan", community_id, plan_id, billing_cycle };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: caller?.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${plan.name} — ${cycleLabel}`,
              description: `Naborhoa platform subscription — ${plan.name}, billed ${billing_cycle}`,
            },
            unit_amount: unitAmount,
            recurring: { interval: cycle.interval, interval_count: cycle.intervalCount },
          },
          quantity: 1,
        },
      ],
      // NO transfer_data / application_fee: this revenue stays with the platform.
      subscription_data: { metadata: planMeta },
      metadata: planMeta,
      success_url: `${origin}/pay/thank-you?plan=1`,
      cancel_url: `${origin}/onboarding`,
    });

    // Stage the selected plan/billing cycle without granting it yet — plan_id is
    // only promoted once payment is confirmed by the webhook. An already-active
    // subscription keeps its current plan_id/access during a plan change.
    await base44.asServiceRole.entities.Community.update(community_id, {
      pending_plan_id: plan_id,
      pending_billing_cycle: billing_cycle,
      platform_checkout_id: session.id,
    });

    return Response.json({ redirectUrl: session.url });
  } catch (error) {
    console.error("create-plan-checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));
