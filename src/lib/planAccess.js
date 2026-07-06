import { getPlan } from "@/lib/subscriptionPlans";

// Maps app route segments to the plan "module" that gates them.
// Routes not listed here are always available (core features).
const ROUTE_MODULE = {
  invoices: "invoices",
  expenses: "expenses",
  polls: "polls",
  elections: "elections",
  "request-types": "request_types",
};

// Modules that make up the always-available core (available on every plan).
const CORE_MODULES = ["requests", "announcements", "documents", "board", "events"];

// Returns the list of module ids a community has access to based on its plan.
// If the community has no plan yet, fall back to the full set so nothing breaks.
export function getAllowedModules(community) {
  const plan = community?.plan_id ? getPlan(community.plan_id) : null;
  if (!plan) return null; // null => no gating (all allowed)
  return plan.modules;
}

// Whether a given module is available for the community.
export function hasModule(community, moduleId) {
  if (CORE_MODULES.includes(moduleId)) return true;
  const allowed = getAllowedModules(community);
  if (!allowed) return true;
  return allowed.includes(moduleId);
}

// Filters a list of nav items (with a `.path`) down to those the plan allows.
export function filterNavByPlan(navItems, community) {
  const allowed = getAllowedModules(community);
  if (!allowed) return navItems;
  return navItems.filter((item) => {
    const segment = item.path.split("/").filter(Boolean).pop();
    const mod = ROUTE_MODULE[segment];
    if (!mod) return true; // not a gated route
    return allowed.includes(mod);
  });
}