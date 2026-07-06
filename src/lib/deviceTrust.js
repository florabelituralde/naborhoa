export const TRUST_KEY = "nabor_trusted_device";
export const TRUST_DAYS = 30;

export function readTrust(userId) {
  try {
    const raw = localStorage.getItem(TRUST_KEY);
    if (!raw) return false;
    const t = JSON.parse(raw);
    return t.userId === userId && t.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function writeTrust(userId) {
  try {
    localStorage.setItem(
      TRUST_KEY,
      JSON.stringify({ userId, expiresAt: Date.now() + TRUST_DAYS * 24 * 60 * 60 * 1000 })
    );
  } catch {}
}

export function clearTrust() {
  try {
    localStorage.removeItem(TRUST_KEY);
  } catch {}
}