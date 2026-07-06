import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Platform fee taken from each resident payment (in basis points). 300 = 3%.
const PLATFORM_FEE_BPS = 300;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { community_id, amount, description, invoice_id, join_code } = body;

    if (!community_id || !amount || amount < 0.50) {
      return Response.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) {
      // Stripe not configured yet — frontend should fall back to Base44 Payments (create-checkout).
      return Response.json({ error: "Stripe not configured", fallback: true }, { status: 503 });
    }

    const community = await base44.asServiceRole.entities.Community.get(community_id);

    if (!community.stripe_account_id || !community.charges_enabled) {
      return Response.json({ error: "Stripe account not ready for charges" }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    const origin = req.headers.get("Origin") || req.headers.get("origin") || "";

    const unitAmount = Math.round(amount * 100);
    const fee = Math.round((unitAmount * PLATFORM_FEE_BPS) / 10000);

    // Build the list of allowed payment method types from the community's
    // accepted methods. Defaults to card-only.
    const accepted = Array.isArray(community.accepted_payment_methods) && community.accepted_payment_methods.length
      ? community.accepted_payment_methods
      : ["card"];
    const paymentMethodTypes = accepted.includes("ach") ? ["card", "us_bank_account"] : ["card"];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: description || "HOA Payment" },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: community.stripe_account_id },
        metadata: {
          community_id,
          invoice_id: invoice_id || "",
          join_code: join_code || "",
        },
      },
      success_url: `${origin}/pay/thank-you?c=${join_code || ""}`,
      cancel_url: invoice_id
        ? `${origin}/pay/invoice/${invoice_id}`
        : `${origin}/c/${join_code || ""}`,
      metadata: {
        community_id,
        invoice_id: invoice_id || "",
        join_code: join_code || "",
      },
    });

    if (invoice_id) {
      await base44.asServiceRole.entities.Invoice.update(invoice_id, {
        wix_checkout_id: session.id, // reuse field to store the Stripe session id
        status: "pending",
      });
    }

    return Response.json({ redirectUrl: session.url });
  } catch (error) {
    console.error("stripe-checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});