// Platform payment processing fee added on top of each resident payment.
// Must match the backend constant in stripe-checkout and stripe-subscription-checkout.
export const PLATFORM_FEE_PERCENT = 1.5;

/**
 * Calculate the processing fee for a given base amount.
 * @param {number} baseAmount - The dues/invoice amount in dollars
 * @returns {number} fee in dollars (rounded to cents)
 */
export function calculateFee(baseAmount) {
  return Math.round(baseAmount * 100 * (PLATFORM_FEE_PERCENT / 100)) / 100;
}

/**
 * Calculate the total amount the resident pays (base + fee).
 * @param {number} baseAmount - The dues/invoice amount in dollars
 * @returns {number} total in dollars (rounded to cents)
 */
export function calculateTotal(baseAmount) {
  return baseAmount + calculateFee(baseAmount);
}