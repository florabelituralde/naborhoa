import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Guest Payment Portal — Step 1: initiate email verification.
//
// Takes a property address + email. Finds invoices whose property_address
// matches the provided address AND whose email (stored on the invoice or
// looked up via the homeowner account) matches the provided email. If a match
// is found, generates a 6-digit OTP, stores its SHA-256 hash in a
// GuestVerification record, and emails the code to the user.
//
// Returns a verification_id that the frontend uses in the verify-otp step.
// On no match, returns a generic error so an attacker can't enumerate which
// address/email pairs have invoices.

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
  (s || "").toLowerCase().replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim();

const canonicalize = (s) => {
  const tokens = normalize(s).split(" ").filter(Boolean).map((t) => SUFFIX_MAP[t] || t);
  return tokens.join(" ");
};

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const GENERIC_ERROR = "No invoice found for this address and email. Please check your information or contact your HOA.";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: "Invalid request body" }, { status: 400 });

    const rawAddress = (body.address || "").trim();
    const email = (body.email || "").trim().toLowerCase();

    if (!rawAddress) return Response.json({ error: "Enter your property address." }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const target = canonicalize(rawAddress);
    const targetTokens = target.split(" ").filter(Boolean);
    if (targetTokens.length < 2) {
      return Response.json({ error: "Please enter your full street address." }, { status: 400 });
    }

    // Find invoices whose property_address matches.
    const allInvoices = await base44.asServiceRole.entities.Invoice.list("-updated_date", 500);
    const addressMatches = allInvoices.filter((inv) => {
      const stored = canonicalize(inv.property_address || "");
      if (!stored) return false;
      return stored === target || target.startsWith(stored + " ");
    });

    if (addressMatches.length === 0) {
      return Response.json({ error: GENERIC_ERROR }, { status: 404 });
    }

    // For each matching invoice, resolve the email: use the invoice's stored
    // email, or fall back to the homeowner's account email via homeowner_id.
    const needsUserLookup = addressMatches.filter((inv) => !inv.email && inv.homeowner_id);
    const userMap = new Map();
    if (needsUserLookup.length > 0) {
      const userIds = [...new Set(needsUserLookup.map((inv) => inv.homeowner_id))];
      // User.filter doesn't support $in directly; fetch all and filter.
      const users = await base44.asServiceRole.entities.User.list("-created_date", 500);
      for (const u of users) {
        if (userIds.includes(u.id)) userMap.set(u.id, (u.email || "").toLowerCase());
      }
    }

    const emailMatches = addressMatches.filter((inv) => {
      const invEmail = (inv.email || userMap.get(inv.homeowner_id) || "").toLowerCase();
      return invEmail === email;
    });

    if (emailMatches.length === 0) {
      return Response.json({ error: GENERIC_ERROR }, { status: 404 });
    }

    // Generate OTP and store its hash.
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await sha256Hex(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const communityId = emailMatches[0].community_id;
    const invoiceIds = emailMatches.map((inv) => inv.id);

    const verification = await base44.asServiceRole.entities.GuestVerification.create({
      email,
      address: rawAddress,
      otp_hash: otpHash,
      expires_at: expiresAt,
      verified: false,
      attempts: 0,
      community_id: communityId,
      invoice_ids: invoiceIds,
    });

    // Send the OTP email.
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: "Your Nabor verification code",
      body:
        `Your verification code is ${otp}.\n\n` +
        "It expires in 10 minutes. If you did not request this code, you can safely ignore this email.",
    });

    return Response.json({
      verification_id: verification.id,
      message: "Verification code sent to your email.",
    });
  } catch (error) {
    console.error("initiate-guest-payment error:", error);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
});