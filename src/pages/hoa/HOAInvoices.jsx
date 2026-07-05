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
import { Loader2, Plus, Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function HOAInvoices() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [homeowners, setHomeowners] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ homeowner_id: "", amount: "", type: "dues", due_date: "", description: "" });
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    const [invs, homes] = await Promise.all([
      base44.entities.Invoice.filter({ community_id: community.id }, "-created_date"),
      base44.entities.User.filter({ community_id: community.id, role: "homeowner" }),
    ]);
    setInvoices(invs);
    setHomeowners(homes);
    setLoading(false);
  };

  useEffect(() => { if (community) loadData(); }, [community]);

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
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Invoices"
        subtitle="Create and track homeowner billing"
        action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>}
      />

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
                <div className="text-right ml-4">
                  <p className="text-xl font-bold">{formatCurrency(inv.amount)}</p>
                  {inv.status === "paid" && (
                    <Button size="sm" className="mt-2" onClick={() => confirmPayment(inv)}>
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
    </div>
  );
}