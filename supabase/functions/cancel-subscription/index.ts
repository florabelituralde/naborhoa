import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// Cancels a homeowner's recurring auto-pay subscription through Stripe (the
// subscription was created via stripe-subscription-checkout). Wix is no longer
// used for HOA fee subscriptions.
Deno.serve(withCors(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
    const { subscription_id } = body;

    if (!subscription_id) {
      return Response.json({ error: 'Missing subscription_id' }, { status: 400 });
    }

    const subs = await base44.asServiceRole.entities.Subscription.filter({
      subscription_id,
      homeowner_id: user.id,
    });
    if (subs.length === 0) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const secretKey = Deno.env.get('Stripe_api_key');
    if (!secretKey) {
      return Response.json({ error: 'Payments are not configured.' }, { status: 503 });
    }

    const stripe = new Stripe(secretKey);
    await stripe.subscriptions.cancel(subscription_id);

    await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
      status: 'canceled',
    });

    return Response.json({ status: 'canceled' });
  } catch (error) {
    console.error('cancel-subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}));