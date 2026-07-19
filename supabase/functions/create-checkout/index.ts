import { createClientFromRequest } from '../_shared/base44-compat.ts';
import { withCors } from '../_shared/cors.ts';

// DEPRECATED — kept as a guard.
//
// Homeowner payments (dues, invoices, auto-pay) are processed through Stripe
// via the community's connected Stripe Connect account so funds go directly
// to the HOA admin:
//   - One-time payments  → stripe-checkout
//   - Recurring auto-pay → stripe-subscription-checkout
//
// This endpoint previously used Wix Payments, which routed homeowner money to
// the platform. That is no longer permitted: the platform only collects its
// own plan subscriptions via create-plan-checkout (Wix). This endpoint now
// refuses to create any checkout so no homeowner payment can ever reach the
// platform through it.
Deno.serve(withCors(async (_req) => {
  return Response.json(
    {
      error:
        "Homeowner payments are processed through Stripe. Use stripe-checkout (one-time) or stripe-subscription-checkout (recurring).",
    },
    { status: 410 }
  );
}));