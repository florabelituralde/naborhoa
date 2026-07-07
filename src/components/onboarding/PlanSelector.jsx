import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Loader2, Sparkles } from "lucide-react";
import {
  PLANS,
  BILLING_CYCLES,
  priceForCycle,
  effectiveMonthly,
} from "@/lib/subscriptionPlans";

export default function PlanSelector({ onSelect, onTrial, onFree, submitting, includeFree = true }) {
  const [cycleId, setCycleId] = useState("monthly");
  const [planId, setPlanId] = useState("growth");

  const cycle = BILLING_CYCLES.find((c) => c.id === cycleId);
  const plans = includeFree ? PLANS : PLANS.filter((p) => p.id !== "free");
  const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
  const isFreePlan = selectedPlan?.monthlyPrice === 0;

  return (
    <div className="bg-card rounded-2xl warm-shadow-md p-6 sm:p-8">
      <h2 className="text-2xl font-bold mb-1">Choose your plan</h2>
      <p className="text-muted-foreground mb-6">
        Pick the plan that fits your community. You can change it anytime.
      </p>

      {/* Billing cycle toggle */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted mb-6">
        {BILLING_CYCLES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCycleId(c.id)}
            className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              cycleId === c.id ? "bg-card text-foreground warm-shadow" : "text-muted-foreground"
            }`}
          >
            {c.label}
            {c.discountLabel && (
              <span className="ml-1.5 text-[10px] font-semibold text-primary">{c.discountLabel}</span>
            )}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className={`grid gap-4 ${includeFree ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        {plans.map((plan) => {
          const selected = planId === plan.id;
          const total = priceForCycle(plan, cycle);
          const perMonth = effectiveMonthly(plan, cycle);
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setPlanId(plan.id)}
              className={`relative flex flex-col text-left rounded-2xl border-2 p-5 transition-all ${
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  <Sparkles className="w-3 h-3" /> Popular
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold">{plan.name}</span>
                {selected && (
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3 h-8">{plan.tagline}</p>
              <div className="mb-1">
                <span className="text-2xl font-bold">${perMonth}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {plan.monthlyPrice === 0
                  ? "Free forever"
                  : cycle.id === "monthly"
                    ? `Billed monthly`
                    : `$${total} billed ${cycle.id}`}
              </p>
              <p className="text-xs font-medium text-primary mb-3">{plan.unitLimit}</p>
              <ul className="space-y-1.5 mt-auto">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {isFreePlan ? (
        <Button
          onClick={onFree}
          disabled={submitting || !onFree}
          className="w-full h-12 mt-6"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
          Get started — it's free
        </Button>
      ) : (
        <Button
          onClick={() => onSelect(planId, cycleId)}
          disabled={submitting}
          className="w-full h-12 mt-6"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
          Continue to payment
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground mt-3">
        {isFreePlan ? "No credit card required" : "Secure checkout · Cancel anytime"}
      </p>

      {/* Auto-renewal disclosure — required by App Store 3.1.2 & Play Store */}
      {!isFreePlan && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Auto-renewing subscription.</strong> Your selected plan (${effectiveMonthly(selectedPlan, cycle)}/mo
            {cycle.id !== "monthly" && `, $${priceForCycle(selectedPlan, cycle)} billed ${cycle.id}`})
            renews automatically at the end of each {cycle.label.toLowerCase()} billing period until canceled.
          </p>
          <p>
            Payment is charged securely through Base44 Payments to your payment method on file. You can
            cancel anytime from your Account page — cancellation stops future renewals and takes effect
            at the end of the current billing cycle.
          </p>
        </div>
      )}

      {onTrial && (
        <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onTrial}
            disabled={submitting}
            className="w-full h-12"
          >
            Start a 14-day free trial
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            No card required · Full access to every feature · Choose a plan later
          </p>
        </>
      )}
    </div>
  );
}