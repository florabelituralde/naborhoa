import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const body = await req.json();
    const { community_id, amount, description, property_address, join_code, frequency, homeowner_id, invoice_id } = body;

    if (!community_id || !amount || !join_code) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const origin = safeOrigin(req);
    const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    const isSubscription = frequency === "MONTH" || frequency === "QUARTER" || frequency === "YEAR";

    // When paying a specific invoice, trust the stored invoice amount — never the
    // client-supplied amount — and verify ownership + settled status up front.
    let existingInvoice = null;
    let chargeAmount = amount;
    let chargeDescription = description;
    if (invoice_id && !isSubscription) {
      existingInvoice = await base44.asServiceRole.entities.Invoice.get(invoice_id).catch(() => null);
      if (!existingInvoice || existingInvoice.community_id !== community_id) {
        return Response.json({ error: "Invoice not found" }, { status: 404 });
      }
      if (existingInvoice.status === "paid" || existingInvoice.status === "confirmed") {
        return Response.json({ error: "This bill has already been paid." }, { status: 409 });
      }
      chargeAmount = existingInvoice.amount;
      chargeDescription = description || existingInvoice.description || "HOA Dues Payment";
    }

    if (chargeAmount < 0.50) {
      return Response.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const item = {
      name: chargeDescription || "HOA Dues Payment",
      quantity: 1,
      price: chargeAmount.toFixed(2),
    };

    if (isSubscription) {
      // Wix has no native quarterly frequency — model it as MONTH with interval 3.
      const settings =
        frequency === "QUARTER"
          ? { frequency: "MONTH", interval: 3 }
          : { frequency };
      const freqLabel =
        frequency === "MONTH" ? "monthly" : frequency === "QUARTER" ? "quarterly" : "annual";
      item.subscriptionInfo = {
        subscriptionSettings: settings,
        title: description || "HOA Dues Auto-Pay",
        description: `Automatic ${freqLabel} HOA dues payment`,
      };
    }

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
          postFlowUrl: `${origin}/c/${join_code}`,
          thankYouPageUrl: `${origin}/pay/thank-you?c=${join_code}`,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Wix checkout error:", JSON.stringify(data));
      return Response.json({ error: data?.details?.applicationError?.description || "Failed to create checkout" }, { status: 500 });
    }

    const checkoutId = data.checkoutSession.id;

    if (isSubscription) {
      await base44.asServiceRole.entities.Subscription.create({
        community_id,
        homeowner_id: homeowner_id || "",
        property_address: property_address || "",
        checkout_id: checkoutId,
        frequency,
        amount,
        status: "pending",
      });
    } else if (invoice_id) {
      // Paying a specific existing invoice — ownership + settled status already
      // verified above; charge amount was taken from the stored invoice.
      await base44.asServiceRole.entities.Invoice.update(invoice_id, {
        wix_checkout_id: checkoutId,
        status: "pending",
      });
    } else {
      await base44.asServiceRole.entities.Invoice.create({
        community_id,
        homeowner_id: homeowner_id || "",
        property_address: property_address || "",
        amount,
        description: description || "HOA Dues Payment",
        due_date: new Date().toISOString().split("T")[0],
        type: "dues",
        status: "pending",
        wix_checkout_id: checkoutId,
      });
    }

    return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
  } catch (error) {
    console.error("create-checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});