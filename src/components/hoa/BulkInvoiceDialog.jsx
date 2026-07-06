import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const PERIODS = [
  { value: "monthly", label: "Monthly", multiplier: 1, desc: "Monthly HOA dues" },
  { value: "quarterly", label: "Quarterly", multiplier: 3, desc: "Quarterly HOA dues" },
  { value: "annual", label: "Annual", multiplier: 12, desc: "Annual HOA dues" },
];

// Generates one invoice per homeowner in a single action, plus a notification each.
export default function BulkInvoiceDialog({ open, onOpenChange, community, homeowners, onDone }) {
  const monthly = community?.monthly_dues || 0;
  const initialPeriod = PERIODS.find((p) => p.value === (community?.billing_cycle || "monthly")) || PERIODS[0];
  const [frequency, setFrequency] = useState(initialPeriod.value);
  const [form, setForm] = useState({
    amount: monthly ? String((monthly * initialPeriod.multiplier).toFixed(2)) : "",
    type: "dues",
    due_date: "",
    description: initialPeriod.desc,
  });
  const [sending, setSending] = useState(false);

  // When the billing period changes, recompute the amount from the community's
  // monthly dues and update the description to match the chosen period.
  const applyFrequency = (freq) => {
    const period = PERIODS.find((p) => p.value === freq) || PERIODS[0];
    setFrequency(freq);
    setForm((f) => ({
      ...f,
      amount: monthly ? String((monthly * period.multiplier).toFixed(2)) : f.amount,
      description: period.desc,
    }));
  };

  const handleSend = async () => {
    setSending(true);
    const amount = parseFloat(form.amount);

    // Create all invoices in one bulk operation
    const created = await base44.entities.Invoice.bulkCreate(
      homeowners.map((h) => ({
        community_id: community.id,
        homeowner_id: h.id,
        amount,
        type: form.type,
        due_date: form.due_date,
        description: form.description,
        status: "pending",
      }))
    );

    // Notify each homeowner about their new invoice
    await base44.entities.Notification.bulkCreate(
      created.map((inv) => ({
        community_id: community.id,
        user_id: inv.homeowner_id,
        type: "invoice_created",
        title: "New invoice",
        body: `${form.type} — ${formatCurrency(amount)}`,
        related_id: inv.id,
      }))
    );

    setSending(false);
    onOpenChange(false);
    onDone?.();
  };

  const valid = form.amount && parseFloat(form.amount) >= 0.5 && form.due_date && homeowners.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Bulk Invoice All Homeowners
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground mb-1">
          This will create an invoice for <span className="font-semibold text-foreground">{homeowners.length}</span> homeowner{homeowners.length === 1 ? "" : "s"} and notify each of them.
        </div>

        <div className="space-y-4">
          <div>
            <Label>Billing Period</Label>
            <Select value={frequency} onValueChange={applyFrequency}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {monthly ? (
              <p className="text-xs text-muted-foreground mt-1">
                Based on monthly dues of {formatCurrency(monthly)} (× multiplier).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Set monthly dues first to auto-fill amounts.</p>
            )}
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
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
            <Label>Amount per homeowner ($)</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="mt-1.5" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={2} />
          </div>
          <Button onClick={handleSend} disabled={!valid || sending} className="w-full">
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send to {homeowners.length} Homeowner{homeowners.length === 1 ? "" : "s"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}