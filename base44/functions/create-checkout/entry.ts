import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Only trust the request Origin when it points at one of our own domains.
// Otherwise fall back to a safe canonical URL so redirect targets can't be
// spoofed via a forged Origin header (open-redirect protection).
function safeOrigin(req: Request): string {
  const raw = req.headers.get("Origin") || req.headers.get("origin") || "";
  try {
    const host = new URL(raw).hostname;
    if (host === "localhost" || host.endsWith(".base44.app") || host.endsWith(".base44.com")) {
      return raw;
    }
  } catch (_) { /* invalid or missing Origin */ }
  return Deno.env.get("APP_BASE_URL") || "https://app.base44.app";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { community_id, amount, description, property_address, join_code, frequency, homeowner_id, invoice_id } = body;

    if (!community_id || !amount || !join_code) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount < 0.50) {
      return Response.json({ error: "Amount must be at least $0.50" }, { status: 400 });
    }

    const origin = safeOrigin(req);
    const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    const isSubscription = frequency === "MONTH" || frequency === "QUARTER" || frequency === "YEAR";

    const item = {
      name: description || "HOA Dues Payment",
      quantity: 1,
      price: amount.toFixed(2),
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
      // Paying a specific existing invoice (dues, fine, fee, or assessment) as a guest.
      // Verify the invoice actually belongs to this community before mutating it,
      // so an arbitrary invoice_id can't be linked to someone else's checkout.
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);
      if (!invoice || invoice.community_id !== community_id) {
        return Response.json({ error: "Invoice not found" }, { status: 404 });
      }
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