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

// Length of the free trial (in days) for communities with no plan.
const TRIAL_DAYS = 14;

// Whether a community with no plan is still within its free trial window.
// During the trial they get access to ALL features; afterwards they drop to
// the Starter plan's feature set.
export function isInTrial(community) {
  if (!community || community.plan_id) return false;
  // A manager who chose the free version (skipped the trial) has an "ended"
  // status — they go straight to the Free tier, no trial window.
  if (community.subscription_status === "ended") return false;
  const created = community.created_date ? new Date(community.created_date) : null;
  if (!created || isNaN(created.getTime())) return false;
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() < trialEnd.getTime();
}

// Days remaining in the free trial (0 if not in trial).
export function trialDaysLeft(community) {
  if (!isInTrial(community)) return 0;
  const created = new Date(community.created_date);
  const trialEnd = new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

// Returns the list of module ids a community has access to based on its plan.
// - Paid plan: that plan's modules.
// - No plan, still in trial: everything (null => no gating).
// - No plan, trial expired: the Free plan's modules (free tier).
export function getAllowedModules(community) {
  if (community?.plan_id) {
    const plan = getPlan(community.plan_id);
    return plan ? plan.modules : null;
  }
  if (isInTrial(community)) return null; // full access during trial
  const free = getPlan("free");
  return free ? free.modules : null;
}

// Max communities an HOA admin may manage on the community's plan.
// null = unlimited (Pro Multi). During the trial, everything is open.
export function getCommunityLimit(community) {
  if (!community) return 1;
  if (isInTrial(community)) return null;
  const plan = community.plan_id ? getPlan(community.plan_id) : getPlan("free");
  return plan && typeof plan.communityLimit === "number" ? plan.communityLimit : 1;
}

// Whether the admin may add another community, given how many they already have.
export function canAddCommunity(community, currentCount) {
  const limit = getCommunityLimit(community);
  if (limit === null) return true;
  return currentCount < limit;
}

// Whether a given module is available for the community.
export function hasModule(community, moduleId) {
  if (CORE_MODULES.includes(moduleId)) return true;
  const allowed = getAllowedModules(community);
  if (!allowed) return true;
  return allowed.includes(moduleId);
}

// Returns the gated module id for a nav item, or null if it's not gated.
export function navItemModule(item) {
  // An explicit module wins (used for action items with no path, e.g. AI Chat).
  if (item.module) return item.module;
  if (!item.path) return null;
  const segment = item.path.split("/").filter(Boolean).pop();
  return ROUTE_MODULE[segment] || null;
}

// Marks each nav item with a `locked` flag based on the plan, instead of
// removing unavailable items — so residents can see a lock on features they
// don't have access to.
export function markNavLocks(navItems, community) {
  return navItems.map((item) => {
    const mod = navItemModule(item);
    const locked = mod ? !hasModule(community, mod) : false;
    return { ...item, locked };
  });
}