import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Check, Users, DollarSign } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import BulkInvoiceDialog from "@/components/hoa/BulkInvoiceDialog";
import ShareLinksPanel from "@/components/hoa/ShareLinksPanel";
import CopyLinkButton from "@/components/CopyLinkButton";

export default function HOAInvoices() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ homeowner_id: "", amount: "", type: "dues", due_date: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [dues, setDues] = useState("");
  const [savingDues, setSavingDues] = useState(false);
  const [duesSaved, setDuesSaved] = useState(false);

  const loadData = async () => {
    try {
      const [invs, homes] = await Promise.all([
        base44.entities.Invoice.filter({ community_id: community.id }, "-created_date"),
        base44.entities.User.filter({ community_id: community.id, role: "homeowner" }),
      ]);
      setInvoices(invs);
      setHomeowners(homes);
      setDues(community.monthly_dues ? String(community.monthly_dues) : "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (community) loadData();
    else setLoading(false);
  }, [community]);

  const handleSaveDues = async () => {
    setSavingDues(true);
    await base44.entities.Community.update(community.id, { monthly_dues: dues ? parseFloat(dues) : 0 });
    setSavingDues(false);
    setDuesSaved(true);
    setTimeout(() => setDuesSaved(false), 2000);
  };

  const handleCreate = async () => {
    setCreating(true);
    const inv = await base44.entities.Invoice.create({
      ...form,
      amount: parseFloat(form.amount),
      community_id: community.id,
    });
    await base44.entities.Notification.create({
      community_id: community.id,
      user_id: form.homeowner_id,
      type: "invoice_created",
      title: "New invoice",
      body: `${form.type} - ${formatCurrency(form.amount)}`,
      related_id: inv.id,
    });
    setForm({ homeowner_id: "", amount: "", type: "dues", due_date: "", description: "" });
    setShowCreate(false);
    setCreating(false);
    loadData();
  };

  const confirmPayment = async (inv) => {
    await base44.entities.Invoice.update(inv.id, { status: "confirmed" });
    await base44.entities.Notification.create({
      community_id: community.id,
      user_id: inv.homeowner_id,
      type: "payment_confirmed",
      title: "Payment confirmed",
      body: `Your payment of ${formatCurrency(inv.amount)} has been confirmed.`,
      related_id: inv.id,
    });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Invoices"
        subtitle="Create and track homeowner billing"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulk(true)} disabled={homeowners.length === 0}>
              <Users className="w-4 h-4 mr-2" /> Bulk Invoice
            </Button>
            <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
          </div>
        }
      />

      <ShareLinksPanel community={community} showInvoiceNote />

      {/* Dues Setup */}
      <div className="bg-card rounded-2xl warm-shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="w-5 h-5 text-primary" /></div>
          <h2 className="font-semibold text-lg">Monthly Dues</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Set your community's standard monthly dues. Used for guest payments and homeowner auto-pay.</p>
        <div className="flex items-end gap-3 max-w-sm">
          <div className="flex-1">
            <Label>Monthly Dues ($)</Label>
            <Input type="number" step="0.01" value={dues} onChange={e => setDues(e.target.value)} className="mt-1.5" placeholder="45.00" />
          </div>
          <Button onClick={handleSaveDues} disabled={savingDues}>
            {savingDues ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : duesSaved ? <Check className="w-4 h-4 mr-2" /> : null}
            {duesSaved ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <p className="text-muted-foreground">No invoices yet. Create one to get started.</p>
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
                <div className="text-right ml-4 flex flex-col items-end gap-2">
                  <p className="text-xl font-bold">{formatCurrency(inv.amount)}</p>
                  {inv.status === "pending" && (
                    <CopyLinkButton url={`${window.location.origin}/pay/invoice/${inv.id}`} label="Share pay link" />
                  )}
                  {inv.status === "paid" && (
                    <Button size="sm" onClick={() => confirmPayment(inv)}>
                      <Check className="w-4 h-4 mr-1" /> Confirm
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Homeowner</Label>
              <Select value={form.homeowner_id} onValueChange={v => setForm({ ...form, homeowner_id: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select homeowner" /></SelectTrigger>
                <SelectContent>
                  {homeowners.map(h => <SelectItem key={h.id} value={h.id}>{h.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dues">Dues</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                  <SelectItem value="fine">Fine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={!form.homeowner_id || !form.amount || !form.due_date || creating} className="w-full">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BulkInvoiceDialog
        open={showBulk}
        onOpenChange={setShowBulk}
        community={community}
        homeowners={homeowners}
        onDone={loadData}
      />
    </div>
  );
}