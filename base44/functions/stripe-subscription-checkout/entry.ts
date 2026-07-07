import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Recurring HOA dues auto-pay via Stripe, settled to the community's connected
// Stripe account (Stripe Connect) with a platform application fee. This replaces
// the old Wix auto-pay checkout — Wix is now used only for the app's own plan
// subscriptions (create-plan-checkout).
const PLATFORM_FEE_PERCENT = 3;

function safeOrigin(req: Request): string {
  const raw = req.headers.get("Origin") || req.headers.get("origin") || "";
  try {
    const host = new URL(raw).hostname;
    if (host === "localhost" || host.endsWith(".base44.app") || host.endsWith(".base44.com")) {
      return raw;
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

    const body = await req.json();
    const { frequency, amount, description } = body;
    if (!frequency) {
      return Response.json({ error: 'Frequency is required' }, { status: 400 });
    }
    if (!amount || amount < 0.50) {
      return Response.json({ error: 'Amount must be at least $0.50' }, { status: 400 });
    }

    const communityId = caller.community_id;
    const community = await base44.asServiceRole.entities.Community.get(communityId);
    if (!community.stripe_account_id || !community.charges_enabled) {
      return Response.json({ error: 'Your HOA has not enabled online payments yet.' }, { status: 400 });
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
    const unitAmount = Math.round(amount * 100);

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
        application_fee_percent: PLATFORM_FEE_PERCENT,
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
      amount,
      status: 'pending',
    });

    return Response.json({ redirectUrl: session.url });
  } catch (error) {
    console.error('stripe-subscription-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});