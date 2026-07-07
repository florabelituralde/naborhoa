import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });
    const raw = (body.address || "").trim();

    if (!raw) {
      return Response.json({ error: "Enter your property address." }, { status: 400 });
    }

    const target = normalize(raw);
    const properties = await base44.asServiceRole.entities.Property.list("-updated_date", 500);
    const match = properties.find((p) => normalize(p.address) === target);

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