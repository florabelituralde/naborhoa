import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
    const invoiceId = (body.invoice_id || "").trim();

    if (!invoiceId) {
      return Response.json({ error: "Missing invoice." }, { status: 400 });
    }

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) {
      return Response.json({ error: "Invoice not found." }, { status: 404 });
    }

    const community = await base44.asServiceRole.entities.Community.get(invoice.community_id);
    if (!community) {
      return Response.json({ error: "Community not found." }, { status: 404 });
    }

    // Public (unauthenticated) callers only get the fields needed to render a
    // payment page. Sensitive owner/property identifiers and payment proofs are
    // stripped to prevent harvesting of residents' private financial data.
    const safeInvoice = {
      id: invoice.id,
      amount: invoice.amount,
      description: invoice.description,
      due_date: invoice.due_date,
      status: invoice.status,
      type: invoice.type,
      community_id: invoice.community_id,
      community_name: community.name,
    };

    return Response.json({
      invoice: safeInvoice,
      community: {
        id: community.id,
        name: community.name,
        join_code: community.join_code,
        stripe_account_id: community.stripe_account_id,
        charges_enabled: !!community.charges_enabled,
      },
    });
  } catch (error) {
    console.error("get-public-invoice error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});