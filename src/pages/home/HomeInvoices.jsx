import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, Check, RefreshCw, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function HomeInvoices() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [paying, setPaying] = useState(false);
  const fileInputRef = useRef(null);
  const [subscription, setSubscription] = useState(null);
  const [showAutopay, setShowAutopay] = useState(false);
  const [autopayFreq, setAutopayFreq] = useState("MONTH");
  const [settingUpAutopay, setSettingUpAutopay] = useState(false);

  const loadData = async () => {
    const invs = await base44.entities.Invoice.filter({ community_id: community.id, homeowner_id: user.id }, "-created_date");
    setInvoices(invs);
    const subs = await base44.entities.Subscription.filter({ community_id: community.id, homeowner_id: user.id, status: "active" });
    setSubscription(subs.length > 0 ? subs[0] : null);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community, user]);

  const handlePay = async () => {
    setPaying(true);
    let proofUrl = null;
    if (proofFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: proofFile });
      proofUrl = file_url;
    }
    await base44.entities.Invoice.update(payingInvoice.id, {
      status: "paid",
      paid_date: new Date().toISOString().split("T")[0],
      payment_proof_url: proofUrl,
    });
    setPaying(false);
    setPayingInvoice(null);
    setProofFile(null);
    loadData();
  };

  const handleSetupAutopay = async () => {
    setSettingUpAutopay(true);
    try {
      const amount = autopayFreq === "MONTH" ? (community.monthly_dues || 45) : (community.monthly_dues || 45) * 12;
      const res = await base44.functions.invoke("create-checkout", {
        community_id: community.id,
        join_code: community.join_code,
        amount,
        description: `HOA Dues Auto-Pay (${autopayFreq === "MONTH" ? "Monthly" : "Annual"}) - ${community.name}`,
        frequency: autopayFreq,
        homeowner_id: user.id,
      });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        setSettingUpAutopay(false);
      }
    } catch {
      setSettingUpAutopay(false);
    }
  };

  const handleCancelAutopay = async () => {
    if (!subscription?.subscription_id) return;
    await base44.functions.invoke("cancel-subscription", { subscription_id: subscription.subscription_id });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader title="My Bills" subtitle="View invoices and mark payments" />

      {/* Auto-Pay Section */}
      {subscription ? (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-semibold">Auto-Pay Active</p>
                <p className="text-sm text-muted-foreground">{subscription.frequency === "MONTH" ? "Monthly" : "Annual"} • ${(subscription.amount || 0).toFixed(2)}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleCancelAutopay}><X className="w-4 h-4 mr-1" /> Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl warm-shadow p-5 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-semibold">Set Up Auto-Pay</p>
                <p className="text-sm text-muted-foreground">Never miss a dues payment</p>
              </div>
            </div>
            <Button onClick={() => setShowAutopay(true)}>Set Up Auto-Pay</Button>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <p className="text-muted-foreground">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div key={inv.id} className="bg-card rounded-2xl warm-shadow p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold capitalize">{inv.type}</h3>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{inv.description}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Due: {formatDate(inv.due_date)}</span>
                    {inv.paid_date && <span>Paid: {formatDate(inv.paid_date)}</span>}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xl font-bold">{formatCurrency(inv.amount)}</p>
                  {inv.status === "pending" && (
                    <Button size="sm" className="mt-2" onClick={() => setPayingInvoice(inv)}>
                      <Check className="w-4 h-4 mr-1" /> Mark Paid
                    </Button>
                  )}
                  {inv.status === "paid" && <p className="text-xs text-muted-foreground mt-2">Awaiting confirmation</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!payingInvoice} onOpenChange={() => { setPayingInvoice(null); setProofFile(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
          {payingInvoice && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="font-semibold capitalize">{payingInvoice.type}</p>
                <p className="text-sm text-muted-foreground">{payingInvoice.description}</p>
                <p className="text-lg font-bold mt-2">{formatCurrency(payingInvoice.amount)}</p>
              </div>
              <div>
                <Label>Payment Proof (optional)</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {proofFile ? (
                    <p className="text-sm font-medium">{proofFile.name}</p>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Upload receipt or proof</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={e => setProofFile(e.target.files[0])} />
              </div>
              <Button onClick={handlePay} disabled={paying} className="w-full">
                {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                Confirm Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAutopay} onOpenChange={() => setShowAutopay(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Set Up Auto-Pay</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose your payment frequency. Your dues will be automatically charged each cycle.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAutopayFreq("MONTH")} className={`p-4 rounded-xl border-2 text-center transition-all ${autopayFreq === "MONTH" ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="font-semibold">${(community?.monthly_dues || 45).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Monthly</p>
              </button>
              <button onClick={() => setAutopayFreq("YEAR")} className={`p-4 rounded-xl border-2 text-center transition-all ${autopayFreq === "YEAR" ? "border-primary bg-primary/5" : "border-border"}`}>
                <p className="font-semibold">${((community?.monthly_dues || 45) * 12).toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Annual</p>
              </button>
            </div>
            <Button onClick={handleSetupAutopay} disabled={settingUpAutopay} className="w-full">
              {settingUpAutopay && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Start Auto-Pay
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}