import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
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

    return Response.json({ invoice, community });
  } catch (error) {
    console.error("get-public-invoice error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});