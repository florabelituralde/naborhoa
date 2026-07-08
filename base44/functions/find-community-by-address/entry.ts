import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Canonicalize a street address for fuzzy matching.
// Maps common full/abbreviated street suffixes to a single canonical form so
// "Drive" matches "Dr", "Street" matches "St", etc.
const SUFFIX_MAP = {
  street: 'st', st: 'st',
  avenue: 'ave', ave: 'ave', av: 'ave',
  road: 'rd', rd: 'rd',
  drive: 'dr', dr: 'dr',
  lane: 'ln', ln: 'ln',
  boulevard: 'blvd', blvd: 'blvd', blv: 'blvd',
  court: 'ct', ct: 'ct',
  place: 'pl', pl: 'pl',
  circle: 'cir', cir: 'cir',
  trail: 'trl', trl: 'trl',
  terrace: 'ter', ter: 'ter',
  parkway: 'pkwy', pkwy: 'pkwy',
  highway: 'hwy', hwy: 'hwy',
  square: 'sq', sq: 'sq',
  park: 'park', pk: 'park',
};

const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const canonicalize = (s) => {
  const tokens = normalize(s).split(" ").filter(Boolean).map((t) => SUFFIX_MAP[t] || t);
  return tokens.join(" ");
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
    const raw = (body.address || "").trim();

    if (!raw) {
      return Response.json({ error: "Enter your property address." }, { status: 400 });
    }

    const target = canonicalize(raw);
    const requireInvoice = body.require_invoice === true;

    // Guest portal: only map the address to a community if an invoice has been
    // issued for that address. This ensures guests can only pay for properties
    // the HOA has actually billed.
    if (requireInvoice) {
      const invoices = await base44.asServiceRole.entities.Invoice.list("-updated_date", 500);
      const invoice = invoices.find((inv) => {
        const stored = canonicalize(inv.property_address || "");
        if (!stored) return false;
        return stored === target || target.startsWith(stored + " ") || stored.startsWith(target + " ");
      });
      if (!invoice) {
        return Response.json(
          { error: "No invoice found for this address. If you believe this is an error, please contact your HOA directly." },
          { status: 404 }
        );
      }
      const community = await base44.asServiceRole.entities.Community.get(invoice.community_id);
      if (!community) {
        return Response.json({ error: "Community not found." }, { status: 404 });
      }
      return Response.json({ community, invoice });
    }

    // Existing behavior: match via Property records.
    const properties = await base44.asServiceRole.entities.Property.list("-updated_date", 500);

    // 1) Exact canonical match (handles abbreviation differences: Dr vs Drive).
    let match = properties.find((p) => canonicalize(p.address) === target);

    // 2) Stored address is a prefix of the query — user appended city/state/zip
    //    (e.g. autocomplete returns "410 Cedar Ridge Dr, Savannah, GA 31411").
    if (!match) {
      match = properties.find((p) => {
        const stored = canonicalize(p.address);
        return stored.length >= 5 && (target === stored || target.startsWith(stored + " "));
      });
    }

    if (!match) {
      return Response.json(
        { error: "We couldn't find that address. Check the address or ask your HOA for your community's join code." },
        { status: 404 }
      );
    }

    const community = await base44.asServiceRole.entities.Community.get(match.community_id);
    if (!community) {
      return Response.json({ error: "Community not found." }, { status: 404 });
    }

    return Response.json({ community });
  } catch (error) {
    console.error("find-community-by-address error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});