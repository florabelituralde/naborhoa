import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, community_id, email } = body;

    if (!community_id) {
      return Response.json({ error: "Missing community_id" }, { status: 400 });
    }

    // Only an authenticated HOA admin who owns this community may connect or
    // inspect its Stripe payout account — prevents payout hijacking.
    let caller;
    try {
      caller = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (caller?.role !== "hoa_admin" || caller?.community_id !== community_id) {
      return Response.json({ error: "Not authorized for this community" }, { status: 403 });
    }

    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) {
      return Response.json(
        { error: "Stripe isn't set up yet. Add your Stripe secret key to enable direct payouts." },
        { status: 503 }
      );
    }

    const stripe = new Stripe(secretKey);
    const origin = req.headers.get("Origin") || req.headers.get("origin") || "";
    const community = await base44.asServiceRole.entities.Community.get(community_id);

    if (action === "create_account") {
      let accountId = community.stripe_account_id;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: email || undefined,
          business_profile: { name: community.name },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { community_id: community.id },
        });
        accountId = account.id;
        await base44.asServiceRole.entities.Community.update(community_id, {
          stripe_account_id: accountId,
          stripe_account_status: "pending",
        });
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/hoa/payment-settings`,
        return_url: `${origin}/hoa/payment-settings`,
        type: "account_onboarding",
      });

      return Response.json({ url: accountLink.url, account_id: accountId });
    }

    if (action === "onboarding_link") {
      if (!community.stripe_account_id) {
        return Response.json({ error: "No connected account" }, { status: 400 });
      }
      const accountLink = await stripe.accountLinks.create({
        account: community.stripe_account_id,
        refresh_url: `${origin}/hoa/payment-settings`,
        return_url: `${origin}/hoa/payment-settings`,
        type: "account_onboarding",
      });
      return Response.json({ url: accountLink.url });
    }

    if (action === "status") {
      if (!community.stripe_account_id) {
        return Response.json({ connected: false });
      }
      const account = await stripe.accounts.retrieve(community.stripe_account_id);
      const status = account.charges_enabled
        ? "enabled"
        : account.details_submitted
        ? "pending"
        : "restricted";

      await base44.asServiceRole.entities.Community.update(community_id, {
        stripe_account_status: status,
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
        stripe_details_submitted: !!account.details_submitted,
      });

      return Response.json({
        connected: true,
        account_id: community.stripe_account_id,
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
        details_submitted: !!account.details_submitted,
        status,
      });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("stripe-connect error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});