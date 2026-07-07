import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import ExpenseBreakdown from "@/components/ExpenseBreakdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Wallet, Paperclip } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/format";
import { EXPENSE_CATEGORIES, getCategory } from "@/lib/expenseCategories";

const emptyForm = { title: "", description: "", amount: "", category: "maintenance", vendor: "", expense_date: new Date().toISOString().slice(0, 10) };

export default function HOAExpenses() {
  const { user, community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const list = await base44.entities.Expense.filter({ community_id: community.id }, "-expense_date");
      setExpenses(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (community) loadData();
    else setLoading(false);
  }, [community]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      let receipt_url;
      if (receiptFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: receiptFile });
        receipt_url = file_url;
      }
      await base44.entities.Expense.create({
        community_id: community.id,
        title: form.title,
        description: form.description,
        amount: Number(form.amount),
        category: form.category,
        vendor: form.vendor,
        expense_date: form.expense_date,
        receipt_url,
        created_by_id: user.id,
      });
      setForm(emptyForm);
      setReceiptFile(null);
      setShowCreate(false);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Expense.delete(id);
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Expenses"
        subtitle="Track community spending — visible to all residents for transparency"
        action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Add Expense</Button>}
      />

      {expenses.length > 0 && (
        <div className="mb-6">
          <ExpenseBreakdown expenses={expenses} />
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No expenses recorded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map(exp => {
            const cat = getCategory(exp.category);
            return (
              <div key={exp.id} className="bg-card rounded-2xl warm-shadow p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{exp.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: cat.color }}>{cat.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(exp.expense_date)}{exp.vendor ? ` · ${exp.vendor}` : ""}
                  </p>
                  {exp.description && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{exp.description}</p>}
                  {exp.receipt_url && (
                    <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
                      <Paperclip className="w-3 h-3" /> View receipt
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="font-bold">{formatCurrency(exp.amount)}</span>
                  <button onClick={() => handleDelete(exp.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5" placeholder="Pool cleaning service" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="mt-1.5" placeholder="0.00" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={form.vendor} onChange={e => setForm({ ...form, vendor: e.target.value })} className="mt-1.5" placeholder="ABC Landscaping" />
            </div>
            <div>
              <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1.5" rows={3} placeholder="Details residents should see..." />
            </div>
            <div>
              <Label>Receipt <span className="text-muted-foreground">(optional)</span></Label>
              <Input type="file" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="mt-1.5" />
            </div>
            <Button onClick={handleCreate} disabled={!form.title || !form.amount || Number(form.amount) <= 0 || saving} className="w-full">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}