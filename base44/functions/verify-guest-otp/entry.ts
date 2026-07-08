import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Guest Payment Portal — Step 2: verify the OTP and return invoices.
//
// Takes a verification_id + 6-digit OTP. Looks up the GuestVerification record,
// checks the OTP hash and expiry, and limits attempts to 5. On success, marks
// the record verified and returns the community, organization, and invoices
// (both unpaid and paid) for the property — the same payload find-community-
// by-address returns, but only after the email has been verified.

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });

    const { verification_id, otp } = body;
    if (!verification_id || !otp) {
      return Response.json({ error: "Missing verification code." }, { status: 400 });
    }

    const record = await base44.asServiceRole.entities.GuestVerification
      .get(verification_id)
      .catch(() => null);

    if (!record) {
      return Response.json({ error: "Verification not found. Please start over." }, { status: 404 });
    }

    // Already verified — allow re-fetching invoices without a new OTP.
    if (record.verified) {
      return await returnInvoices(base44, record);
    }

    // Check expiry.
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return Response.json({ error: "Verification code expired. Please start over." }, { status: 400 });
    }

    // Check attempts.
    if ((record.attempts || 0) >= MAX_ATTEMPTS) {
      return Response.json({ error: "Too many attempts. Please start over." }, { status: 400 });
    }

    // Verify OTP hash.
    const providedHash = await sha256Hex(String(otp));
    if (providedHash !== record.otp_hash) {
      await base44.asServiceRole.entities.GuestVerification.update(verification_id, {
        attempts: (record.attempts || 0) + 1,
      });
      const remaining = MAX_ATTEMPTS - (record.attempts || 0) - 1;
      return Response.json({
        error: remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many incorrect attempts. Please start over.",
      }, { status: 400 });
    }

    // OTP is correct — mark verified.
    await base44.asServiceRole.entities.GuestVerification.update(verification_id, {
      verified: true,
    });

    return await returnInvoices(base44, record);
  } catch (error) {
    console.error("verify-guest-otp error:", error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
});

async function returnInvoices(base44, record) {
  // Fetch all invoices by their stored IDs.
  const all = await base44.asServiceRole.entities.Invoice.list("-updated_date", 500);
  const idSet = new Set(record.invoice_ids || []);
  const invoices = all.filter((inv) => idSet.has(inv.id));

  if (invoices.length === 0) {
    return Response.json({ error: "No invoices found. Please contact your HOA." }, { status: 404 });
  }

  const community = await base44.asServiceRole.entities.Community.get(record.community_id).catch(() => null);
  if (!community) {
    return Response.json({ error: "Community not found." }, { status: 404 });
  }

  let organization = null;
  if (community.organization_id) {
    organization = await base44.asServiceRole.entities.Organization.get(community.organization_id).catch(() => null);
  }

  return Response.json({ community, organization, invoices });
}