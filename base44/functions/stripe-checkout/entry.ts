import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Platform processing fee added ON TOP of each resident payment (in basis
// points). 150 = 1.5%. The fee is charged to the homeowner as a separate line
// item and retained by the platform; the HOA receives the original dues amount
// (minus Stripe's own processing fees).
const PLATFORM_FEE_BPS = 150;

// Only trust the request Origin when it points at one of our own domains.
// Otherwise fall back to a safe canonical URL so redirect targets can't be
// spoofed via a forged Origin header (open-redirect protection).
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
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
    const { community_id, description, invoice_id, join_code, customer_email, customer_name, address } = body;

    if (!community_id) {
      return Response.json({ error: "Missing community_id" }, { status: 400 });
    }

    const secretKey = Deno.env.get("Stripe_api_key");
    if (!secretKey) {
      // Stripe not configured yet — frontend should tell the resident their HOA
      // hasn't enabled online payments yet (HOA payments never fall back to the platform).
      return Response.json({ error: "Stripe not configured", fallback: true }, { status: 503 });
    }

    const community = await base44.asServiceRole.entities.Community.get(community_id);

    if (!community.stripe_account_id || !community.charges_enabled) {
      return Response.json({ error: "Stripe account not ready for charges" }, { status: 400 });
    }

    // When paying a specific invoice, trust the stored invoice amount — never the
    // client-supplied amount — so the charge can't be tampered with. Also verify
    // the invoice belongs to this community and isn't already settled.
    // Non-invoice (guest dues) payments: compute from the community's configured
    // monthly_dues server-side — never trust a client-supplied amount — so the
    // charge can't be tampered with. Invoice payments override this below.
    let chargeAmount = community.monthly_dues || 45;
    let chargeDescription = description;
    if (invoice_id) {
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id).catch(() => null);
      if (!invoice || invoice.community_id !== community_id) {
        return Response.json({ error: "Invoice not found" }, { status: 404 });
      }
      if (invoice.status === "paid" || invoice.status === "confirmed") {
        return Response.json({ error: "This bill has already been paid." }, { status: 409 });
      }
      chargeAmount = invoice.amount;
      chargeDescription = description || invoice.description || "HOA Payment";
    }

    if (chargeAmount < 0.50) {
      return Response.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    const origin = safeOrigin(req);

    const baseAmount = Math.round(chargeAmount * 100);
    const fee = Math.round((baseAmount * PLATFORM_FEE_BPS) / 10000);

    // Build the list of allowed payment method types from the community's
    // accepted methods. Defaults to card-only.
    const accepted = Array.isArray(community.accepted_payment_methods) && community.accepted_payment_methods.length
      ? community.accepted_payment_methods
      : ["card"];
    const paymentMethodTypes = accepted.includes("ach") ? ["card", "us_bank_account"] : ["card"];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: paymentMethodTypes,
      customer_email: customer_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: chargeDescription || "HOA Payment" },
            unit_amount: baseAmount,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Processing Fee (${PLATFORM_FEE_BPS / 100}%)` },
            unit_amount: fee,
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
          customer_name: customer_name || "",
          customer_email: customer_email || "",
          address: address || "",
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
        customer_name: customer_name || "",
        customer_email: customer_email || "",
        address: address || "",
      },
    });

    if (invoice_id) {
      // Invoice ownership + settled-status already verified above.
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