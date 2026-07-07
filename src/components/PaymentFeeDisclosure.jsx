import React from "react";
import { PLATFORM_FEE_PERCENT, calculateFee, calculateTotal } from "@/lib/paymentFee";

/**
 * Discloses the 1.5% processing fee breakdown to the resident before payment.
 * @param {number} baseAmount - The dues/invoice amount in dollars
 * @param {string} className - Optional extra classes
 */
export default function PaymentFeeDisclosure({ baseAmount, className = "" }) {
  const amount = Number(baseAmount) || 0;
  const fee = calculateFee(amount);
  const total = calculateTotal(amount);

  return (
    <div className={`rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5 ${className}`}>
      <div className="flex justify-between">
        <span>Amount</span>
        <span className="font-medium">${amount.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Processing fee ({PLATFORM_FEE_PERCENT}%)</span>
        <span className="font-medium">${fee.toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-semibold text-foreground pt-1.5 border-t border-border">
        <span>Total charged</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}