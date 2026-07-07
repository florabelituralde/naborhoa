// Nabor platform subscription plans for HOA managers.
// Prices are per community. Monthly is the base; quarterly & annual apply discounts.
// communityLimit = max communities an HOA admin may manage (null = unlimited).
// IDs are stable (free/starter/growth/pro/pro_multi); display names are user-facing.

export const BILLING_CYCLES = [
  { id: "monthly", label: "Monthly", frequency: "MONTH", multiplier: 1, discountLabel: null },
  { id: "quarterly", label: "Quarterly", frequency: "MONTH", multiplier: 3, discountLabel: "Save 10%", discount: 0.1 },
  { id: "annual", label: "Annual", frequency: "YEAR", multiplier: 12, discountLabel: "Save 20%", discount: 0.2 },
];

export const PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Announcements, payments & community",
    monthlyPrice: 0,
    highlighted: false,
    unitLimit: "1 community · up to 25 homes",
    communityLimit: 1,
    features: [
      "Community announcements",
      "Board directory",
      "Community events",
      "Online dues & invoice payments",
      "Email support",
    ],
    modules: ["announcements", "board", "events", "invoices"],
  },
  {
    id: "starter",
    name: "Community",
    tagline: "Requests & documents",
    monthlyPrice: 19,
    highlighted: false,
    unitLimit: "1 community · up to 50 homes",
    communityLimit: 1,
    features: [
      "Everything in Free",
      "Maintenance & repair requests",
      "Document library",
      "Priority email support",
    ],
    modules: ["announcements", "board", "events", "invoices", "requests", "documents"],
  },
  {
    id: "growth",
    name: "Essential",
    tagline: "Expenses, polls & elections",
    monthlyPrice: 49,
    highlighted: true,
    unitLimit: "1 community · up to 150 homes",
    communityLimit: 1,
    features: [
      "Everything in Community",
      "Expense tracking",
      "Polls & surveys",
      "Board elections",
      "Custom request types",
      "Priority support",
    ],
    modules: [
      "announcements", "board", "events", "requests", "documents",
      "invoices", "expenses", "polls", "elections", "request_types",
    ],
  },
  {
    id: "pro",
    name: "Connected",
    tagline: "AI & automation",
    monthlyPrice: 99,
    highlighted: false,
    unitLimit: "1 community · unlimited homes",
    communityLimit: 1,
    features: [
      "Everything in Essential",
      "AI resident assistant",
      "AI-powered resident responses",
      "Automated dues reminders",
      "Dedicated onboarding",
      "Phone & priority support",
      "1 community",
    ],
    modules: [
      "announcements", "board", "events", "requests", "documents",
      "invoices", "expenses", "polls", "elections", "request_types",
      "ai_assistant", "automations",
    ],
  },
  {
    id: "pro_multi",
    name: "Portfolio",
    tagline: "Manage multiple communities",
    monthlyPrice: 199,
    highlighted: false,
    unitLimit: "Unlimited communities & homes",
    communityLimit: null,
    features: [
      "Everything in Connected",
      "Multiple communities",
      "Multiple admin dashboards",
      "Portfolio management",
      "Advanced automation",
      "Dedicated account manager",
    ],
    modules: [
      "announcements", "board", "events", "requests", "documents",
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