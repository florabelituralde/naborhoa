export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(p) {
  return PASSWORD_RULES.every((r) => r.test(p));
}

export function passwordStrength(p) {
  return PASSWORD_RULES.filter((r) => r.test(p)).length;
}