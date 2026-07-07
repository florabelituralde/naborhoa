import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Recurring HOA dues auto-pay via Stripe, settled to the community's connected
// Stripe account (Stripe Connect) with a platform application fee. This replaces
// the old Wix auto-pay checkout — Wix is now used only for the app's own plan
// subscriptions (create-plan-checkout).
// Platform processing fee (1.5%) added ON TOP of the recurring dues amount.
// The homeowner pays dues + 1.5%; the platform retains the 1.5% via
// application_fee_percent, and the HOA receives the original dues (minus
// Stripe's own processing fees).
const PLATFORM_FEE_PERCENT = 1.5;

function safeOrigin(req: Request): string {
  // Trust the request Origin so redirect URLs match the domain the user is
  // actually on (the current/published domain). Browsers set Origin to the
  // page's own origin and cannot spoof it cross-origin, so this is safe for
  // the checkout flow. Fall back to a canonical URL only when Origin is
  // missing or not a valid http(s) URL (e.g. direct endpoint calls).
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
    let caller;
    try {
      caller = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!caller || caller.role !== 'homeowner' || !caller.community_id) {
      return Response.json({ error: 'Only homeowners can set up auto-pay' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
    const { frequency, description } = body;

    // Never trust a client-supplied amount. The recurring charge is computed
    // server-side from the community's configured monthly_dues so a homeowner
    // can't tamper with the charge amount (e.g. set it to the $0.50 minimum).
    const FREQ_MONTHS: Record<string, number> = { MONTH: 1, QUARTER: 3, YEAR: 12 };
    const months = FREQ_MONTHS[frequency];
    if (!months) {
      return Response.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const communityId = caller.community_id;
    const community = await base44.asServiceRole.entities.Community.get(communityId);
    if (!community.stripe_account_id || !community.charges_enabled) {
      return Response.json({ error: 'Your HOA has not enabled online payments yet.' }, { status: 400 });
    }

    // Compute the recurring dues from the community's monthly_dues (server-side
    // source of truth), not from any client-supplied amount.
    const duesAmount = (community.monthly_dues || 0) * months;
    if (duesAmount < 0.50) {
      return Response.json({ error: 'Dues amount must be at least $0.50' }, { status: 400 });
    }

    const secretKey = Deno.env.get("Stripe_api_key");
    if (!secretKey) {
      return Response.json({ error: 'Payments are not configured.' }, { status: 503 });
    }

    let propertyAddress = '';
    if (caller.property_id) {
      try {
        const property = await base44.asServiceRole.entities.Property.get(caller.property_id);
        propertyAddress = property?.address || '';
      } catch {
        // property lookup best-effort
      }
    }

    // Stripe recurring interval: QUARTER -> monthly every 3, YEAR -> yearly.
    const interval = frequency === 'YEAR' ? 'year' : 'month';
    const intervalCount = frequency === 'QUARTER' ? 3 : 1;

    const stripe = new Stripe(secretKey);
    const origin = safeOrigin(req);
    const baseAmount = Math.round(duesAmount * 100);
    const feeAmount = Math.round((baseAmount * PLATFORM_FEE_PERCENT) / 100);
    const unitAmount = baseAmount + feeAmount;
    // Compute the exact percentage of the total charge that equals the fee,
    // so Stripe deducts precisely feeAmount each cycle.
    const applicationFeePercent = unitAmount > 0
      ? Number(((feeAmount / unitAmount) * 100).toFixed(6))
      : 0;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: description || 'HOA Dues Auto-Pay' },
            unit_amount: unitAmount,
            recurring: { interval, interval_count: intervalCount },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        application_fee_percent: applicationFeePercent,
        transfer_data: { destination: community.stripe_account_id },
        metadata: {
          community_id: communityId,
          homeowner_id: caller.id,
          frequency,
        },
      },
      success_url: `${origin}/pay/thank-you?c=${community.join_code || ''}`,
      cancel_url: `${origin}/home/invoices`,
      metadata: {
        community_id: communityId,
        homeowner_id: caller.id,
        frequency,
      },
    });

    await base44.asServiceRole.entities.Subscription.create({
      community_id: communityId,
      homeowner_id: caller.id,
      property_address: propertyAddress,
      checkout_id: session.id,
      frequency,
      amount: duesAmount,
      status: 'pending',
    });

    return Response.json({ redirectUrl: session.url });
  } catch (error) {
    console.error('stripe-subscription-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});