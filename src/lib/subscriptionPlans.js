// Nabor platform subscription plans for HOA managers.
// Prices are per community. Monthly is the base; quarterly & annual apply discounts.
// communityLimit = max communities an HOA admin may manage (null = unlimited).

export const BILLING_CYCLES = [
  { id: "monthly", label: "Monthly", frequency: "MONTH", multiplier: 1, discountLabel: null },
  { id: "quarterly", label: "Quarterly", frequency: "MONTH", multiplier: 3, discountLabel: "Save 10%", discount: 0.1 },
  { id: "annual", label: "Annual", frequency: "YEAR", multiplier: 12, discountLabel: "Save 20%", discount: 0.2 },
];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Essentials to get started",
    monthlyPrice: 0,
    highlighted: false,
    unitLimit: "1 community · up to 25 homes",
    communityLimit: 1,
    features: [
      "Maintenance & repair requests",
      "Community announcements",
      "Document library",
      "Board directory",
      "Community events",
    ],
    modules: ["requests", "announcements", "documents", "board", "events"],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "Invoicing & expense tracking",
    monthlyPrice: 19,
    highlighted: false,
    unitLimit: "1 community · up to 50 homes",
    communityLimit: 1,
    features: [
      "Everything in Free",
      "Online dues & invoicing",
      "Expense tracking",
      "Priority email support",
    ],
    modules: [
      "requests", "announcements", "documents", "board", "events",
      "invoices", "expenses",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Full operations, no AI",
    monthlyPrice: 49,
    highlighted: true,
    unitLimit: "1 community · up to 150 homes",
    communityLimit: 1,
    features: [
      "Everything in Starter",
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
    tagline: "Full HOA ops + AI & automation",
    monthlyPrice: 99,
    highlighted: false,
    unitLimit: "1 community · unlimited homes",
    communityLimit: 1,
    features: [
      "Everything in Growth",
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
  {
    id: "pro_multi",
    name: "Pro Multi",
    tagline: "Manage multiple communities",
    monthlyPrice: 199,
    highlighted: false,
    unitLimit: "Unlimited communities & homes",
    communityLimit: null,
    features: [
      "Everything in Pro",
      "Multiple communities per admin",
      "Cross-community switching",
      "Dedicated account manager",
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