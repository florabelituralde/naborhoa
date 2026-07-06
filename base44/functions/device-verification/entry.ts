import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Generates and verifies emailed verification codes for the device-trust gate.
// Codes are stored as SHA-256 hashes (never plaintext) and expire after 10 minutes.
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'send') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const codeHash = await sha256Hex(code);

      await base44.asServiceRole.entities.DeviceVerification.create({
        user_id: user.id,
        code_hash: codeHash,
        expires_at: expiresAt,
        consumed: false
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Your Nabor verification code',
        body:
          `Your verification code is ${code}.\n\n` +
          'It expires in 10 minutes. If you did not request this code, you can safely ignore this email.'
      });

      return Response.json({ sent: true });
    }

    if (action === 'verify') {
      const code = String(body.code || '');
      const records = await base44.asServiceRole.entities.DeviceVerification.filter(
        { user_id: user.id, consumed: false },
        '-created_date',
        5
      );
      const now = Date.now();
      const codeHash = await sha256Hex(code);
      let matched = null;
      for (const r of records) {
        if (new Date(r.expires_at).getTime() > now && r.code_hash === codeHash) {
          matched = r;
          break;
        }
      }
      if (!matched) {
        return Response.json({ error: 'Invalid or expired code' }, { status: 400 });
      }
      await base44.asServiceRole.entities.DeviceVerification.update(matched.id, {
        consumed: true
      });
      return Response.json({ verified: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('device-verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});