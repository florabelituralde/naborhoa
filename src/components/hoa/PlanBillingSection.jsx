import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CreditCard, Check, ArrowUpRight, Sparkles } from "lucide-react";
import { getPlan, getCycle, priceForCycle, effectiveMonthly } from "@/lib/subscriptionPlans";
import PlanSelector from "@/components/onboarding/PlanSelector";

const STATUS_STYLES = {
  active: "bg-primary/10 text-primary",
  pending: "bg-amber-100 text-amber-700",
  canceled: "bg-destructive/10 text-destructive",
  ended: "bg-muted text-muted-foreground",
};

export default function PlanBillingSection({ community }) {
  const [showChange, setShowChange] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const plan = community.plan_id ? getPlan(community.plan_id) : null;
  const cycle = community.billing_cycle ? getCycle(community.billing_cycle) : null;
  const status = community.subscription_status || "pending";

  const handleSelect = async (planId, cycleId) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("create-plan-checkout", {
        community_id: community.id,
        plan_id: planId,
        billing_cycle: cycleId,
      });
      const url = res.data?.redirectUrl;
      if (url) {
        window.location.href = url;
        return;
      }
      setError(res.data?.error || "Failed to start checkout");
    } catch (err) {
      setError(err.message || "Failed to start checkout");
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Subscription &amp; Plan</h2>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
          {status}
        </span>
      </div>

      {plan ? (
        <div className="rounded-xl border border-border p-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{plan.name}</span>
                {plan.highlighted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <Sparkles className="w-3 h-3" /> Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{plan.tagline}</p>
              <p className="text-xs font-medium text-primary mt-1">{plan.unitLimit}</p>
            </div>
            {cycle && (
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold">${effectiveMonthly(plan, cycle)}</p>
                <p className="text-xs text-muted-foreground">/mo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ${priceForCycle(plan, cycle)} billed {cycle.id}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4 mb-4 text-center">
          <p className="text-sm text-muted-foreground">You're on the free plan. Upgrade to unlock premium features.</p>
        </div>
      )}

      <Button onClick={() => setShowChange(true)} variant={plan ? "outline" : "default"}>
        <ArrowUpRight className="w-4 h-4 mr-2" />
        {plan ? "Change plan" : "Upgrade plan"}
      </Button>

      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <CreditCard className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Payment method and billing address are collected securely on the checkout page. You can update them there when changing your plan.</span>
      </div>

      <Dialog open={showChange} onOpenChange={setShowChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Choose your plan</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-destructive mb-2">{error}</p>}
          <PlanSelector onSelect={handleSelect} submitting={submitting} />
        </DialogContent>
      </Dialog>
    </div>
  );
}