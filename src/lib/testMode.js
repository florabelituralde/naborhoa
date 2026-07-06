// Detects whether the app is running against the Test (dev) database.
//
// Base44 selects the Test database via an `environment` param (passed on the URL
// as ?environment=dev and persisted in localStorage as base44_environment, the
// same way other app params work). We use this to let the Base44 Testing Agent
// run end-to-end flows without the email OTP / device-verification steps that it
// can't complete (it has no inbox to read a code from).
//
// IMPORTANT: this only ever returns true against the Test database. In
// Production the value is never "dev", so all verification stays fully enforced.
export function isTestEnvironment() {
  if (typeof window === "undefined") return false;
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("environment");
    const stored = window.localStorage.getItem("base44_environment");
    return fromUrl === "dev" || stored === "dev";
  } catch {
    return false;
  }
}