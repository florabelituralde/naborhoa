// Nabor platform subscription plans for HOA managers.
// Prices are per community. Monthly is the base; quarterly & annual apply discounts.

export const BILLING_CYCLES = [
  { id: "monthly", label: "Monthly", frequency: "MONTH", multiplier: 1, discountLabel: null },
  { id: "quarterly", label: "Quarterly", frequency: "MONTH", multiplier: 3, discountLabel: "Save 10%", discount: 0.1 },
  { id: "annual", label: "Annual", frequency: "YEAR", multiplier: 12, discountLabel: "Save 20%", discount: 0.2 },
];

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For small, self-managed HOAs",
    monthlyPrice: 19,
    highlighted: false,
    unitLimit: "Up to 25 homes",
    features: [
      "Maintenance & repair requests",
      "Community announcements",
      "Document library",
      "Board directory",
      "Email support",
    ],
    modules: ["requests", "announcements", "documents", "board", "events"],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Most popular for active communities",
    monthlyPrice: 49,
    highlighted: true,
    unitLimit: "Up to 150 homes",
    features: [
      "Everything in Starter",
      "Online dues & invoicing",
      "Expense tracking & finances",
      "Polls & board elections",
      "Custom request types",
      "Priority support",
    ],
    modules: [
      "requests", "announcements", "documents", "board", "events",
      "invoices", "expenses", "polls", "elections", "request_types",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For management companies & large HOAs",
    monthlyPrice: 99,
    highlighted: false,
    unitLimit: "Unlimited homes",
    features: [
      "Everything in Growth",
      "Unlimited communities",
      "AI resident assistant",
      "Automated dues reminders",
      "Dedicated onboarding",
      "Phone & priority support",
    ],
    modules: [
      "requests", "announcements", "documents", "board", "events",
      "invoices", "expenses", "polls", "elections", "request_types",
      "ai_assistant", "automations",
    ],
  },
];

export function getPlan(planId) {
  return PLANS.find((p) => p.id === planId) || null;
}

export function getCycle(cycleId) {
  return BILLING_CYCLES.find((c) => c.id === cycleId) || BILLING_CYCLES[0];
}

// Returns the total charged amount for a plan on a given billing cycle.
export function priceForCycle(plan, cycle) {
  const gross = plan.monthlyPrice * cycle.multiplier;
  const discount = cycle.discount || 0;
  return Math.round(gross * (1 - discount) * 100) / 100;
}

// Effective monthly cost after discount (for "$X/mo" display).
export function effectiveMonthly(plan, cycle) {
  const total = priceForCycle(plan, cycle);
  return Math.round((total / cycle.multiplier) * 100) / 100;
}