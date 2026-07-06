import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  CreditCard,
  Landmark,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Building2,
  Banknote,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function HOAPaymentSettings() {
  const { user, community } = useOutletContext();
  const [busy, setBusy] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [methods, setMethods] = useState({
    card: community.accepted_payment_methods?.includes("card") ?? true,
    ach: community.accepted_payment_methods?.includes("ach") ?? false,
  });
  const [lateFees, setLateFees] = useState({
    apply: community.apply_late_fees ?? false,
    amount: community.late_fee_amount ?? 0,
    grace: community.late_fee_grace_days ?? 0,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [acct, setAcct] = useState({
    status: community.stripe_account_status || "none",
    charges_enabled: community.charges_enabled || false,
    payouts_enabled: community.payouts_enabled || false,
    details_submitted: community.stripe_details_submitted || false,
    account_id: community.stripe_account_id || "",
  });

  if (user?.role !== "hoa_admin") {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Only HOA administrators can manage payment settings.
      </div>
    );
  }

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await base44.functions.invoke("stripe-connect", {
        action: "status",
        community_id: community.id,
      });
      setAcct({
        status: res.data.status || "none",
        charges_enabled: res.data.charges_enabled || false,
        payouts_enabled: res.data.payouts_enabled || false,
        details_submitted: res.data.details_submitted || false,
        account_id: res.data.account_id || community.stripe_account_id || "",
      });
      window.location.reload();
    } catch (err) {
      toast({ title: "Couldn't refresh", description: err.response?.data?.error });
    }
    setStatusLoading(false);
  };

  const connect = async () => {
    setBusy("connect");
    try {
      const res = await base44.functions.invoke("stripe-connect", {
        action: "create_account",
        community_id: community.id,
        email: user.email,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      toast({ title: "Stripe connection failed", description: err.response?.data?.error });
    }
    setBusy("");
  };

  const openOnboarding = async () => {
    setBusy("onboard");
    try {
      const res = await base44.functions.invoke("stripe-connect", {
        action: "onboarding_link",
        community_id: community.id,
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err) {
      toast({ title: "Couldn't open onboarding", description: err.response?.data?.error });
    }
    setBusy("");
  };

  const toggleMethod = (key) => {
    setMethods((m) => {
      const next = { ...m, [key]: !m[key] };
      if (!next.card && !next.ach) next.card = true; // keep at least one
      return next;
    });
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const accepted = ["card", ...(methods.ach ? ["ach"] : [])];
    try {
      await base44.entities.Community.update(community.id, {
        accepted_payment_methods: accepted,
        apply_late_fees: lateFees.apply,
        late_fee_amount: parseFloat(lateFees.amount) || 0,
        late_fee_grace_days: parseInt(lateFees.grace) || 0,
      });
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err.response?.data?.error });
    }
    setSavingSettings(false);
  };

  const connected = !!acct.account_id;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="Payment Settings" subtitle="How residents pay and where funds are deposited" />

      {/* Stripe Connect */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Payouts to Your HOA Bank</h2>
            <p className="text-sm text-muted-foreground">Connect a Stripe account so resident payments deposit directly to your HOA bank.</p>
          </div>
        </div>

        {!connected ? (
          <div className="p-4 rounded-xl bg-muted/50 mb-4">
            <p className="text-sm text-muted-foreground mb-3">
              No Stripe account connected yet. Connect to route payments to your bank. Until then, payments use the default Base44 Payments gateway.
            </p>
            <Button onClick={connect} disabled={busy === "connect"}>
              {busy === "connect" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Landmark className="w-4 h-4 mr-2" />}
              Connect with Stripe
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatusPill label="Charges" ok={acct.charges_enabled} />
              <StatusPill label="Payouts to bank" ok={acct.payouts_enabled} />
              <StatusPill label="Details submitted" ok={acct.details_submitted} />
              <StatusPill label="Account ID" ok={!!acct.account_id} value={acct.account_id ? acct.account_id.slice(0, 10) + "…" : ""} />
            </div>

            {acct.status !== "enabled" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Onboarding isn't complete. Finish setting up your bank details to start receiving payouts.</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={refreshStatus} disabled={statusLoading}>
                {statusLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh status
              </Button>
              <Button variant="outline" size="sm" onClick={openOnboarding} disabled={busy === "onboard"}>
                {busy === "onboard" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Landmark className="w-4 h-4 mr-2" />}
                Update bank details
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 rounded-xl bg-muted/50 flex items-start gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Stripe handles bank-account verification, PCI compliance, and secure payouts. Nabor never sees or stores your bank credentials. A small platform fee is taken from each payment.
          </p>
        </div>
      </div>

      {/* Accepted payment methods */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Accepted Payment Methods</h2>
            <p className="text-sm text-muted-foreground">Choose how residents can pay invoices and dues.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <MethodCard
            icon={CreditCard}
            label="Card"
            description="Credit & debit cards"
            active={methods.card}
            onClick={() => toggleMethod("card")}
          />
          <MethodCard
            icon={Banknote}
            label="Bank transfer (ACH)"
            description="Direct from bank account"
            active={methods.ach}
            onClick={() => toggleMethod("ach")}
          />
        </div>
      </div>

      {/* Late fees */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Late Fees & Grace Period</h2>
              <p className="text-sm text-muted-foreground">Apply fees to overdue invoices after a grace period.</p>
            </div>
          </div>
          <Switch checked={lateFees.apply} onCheckedChange={(v) => setLateFees({ ...lateFees, apply: v })} />
        </div>

        {lateFees.apply && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Late fee amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={lateFees.amount}
                onChange={(e) => setLateFees({ ...lateFees, amount: e.target.value })}
                className="mt-1.5"
                placeholder="25.00"
              />
            </div>
            <div>
              <Label>Grace period (days after due date)</Label>
              <Input
                type="number"
                value={lateFees.grace}
                onChange={(e) => setLateFees({ ...lateFees, grace: e.target.value })}
                className="mt-1.5"
                placeholder="10"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={savingSettings} size="lg">
          {savingSettings ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}

function StatusPill({ label, ok, value }) {
  return (
    <div className={`p-3 rounded-xl border ${ok ? "border-primary/30 bg-primary/5" : "border-border bg-muted/50"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        {ok ? (
          <CheckCircle2 className="w-4 h-4 text-primary" />
        ) : (
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
        )}
        <span className={`text-sm font-medium ${ok ? "text-foreground" : "text-muted-foreground"}`}>
          {value || (ok ? "Active" : "Pending")}
        </span>
      </div>
    </div>
  );
}

function MethodCard({ icon: Icon, label, description, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-primary/10" : "bg-muted"}`}>
        <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      {active && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
    </button>
  );
}