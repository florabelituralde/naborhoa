// Friendly, user-facing messages for authentication errors.
// Maps raw SDK / network error strings to plain guidance so users never
// see a technical stack trace or cryptic status code.

const NETWORK_RE = /failed to fetch|networkerror|network request failed|load failed|err_connection|offline|timeout|aborted/;
const RATE_RE = /rate|too many|429|throttl/;
const OTP_RE = /invalid.*code|expired|verification failed|invalid otp|wrong code|incorrect.*code/;
const CREDENTIALS_RE = /unauthorized|invalid email or password|incorrect|bad credentials|\b401\b/;
const DUPLICATE_RE = /already|exist|registered|\b409\b|duplicate/;

function messageText(err) {
  const parts = [err?.message, err?.status ? String(err.status) : "", err?.code].filter(Boolean);
  return parts.join(" ").toLowerCase();
}

// Maps an auth error to a clear, actionable message.
export function friendlyAuthError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  const raw = messageText(err);
  if (!raw) return fallback;
  if (NETWORK_RE.test(raw)) {
    return "Connection problem. Check your internet and try again.";
  }
  if (RATE_RE.test(raw)) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (OTP_RE.test(raw)) {
    return "That code is invalid or expired. Please try again or request a new one.";
  }
  if (DUPLICATE_RE.test(raw)) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (CREDENTIALS_RE.test(raw)) {
    return "Incorrect email or password. Please try again.";
  }
  return err.message || fallback;
}

// True when an error indicates the account's email was never verified.
// Login uses this to route the user into the OTP screen instead of a
// hard "invalid credentials" error.
export function isUnverifiedError(err) {
  const raw = (err?.message || "").toLowerCase();
  return /verif|unverified|not confirmed/.test(raw);
}