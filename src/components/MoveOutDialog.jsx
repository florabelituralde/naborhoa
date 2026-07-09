import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DrawerSelect from "@/components/mobile/DrawerSelect";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import { LogOut, Loader2, AlertTriangle, Receipt, KeyRound } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function MoveOutDialog({ user }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [dues, setDues] = useState([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [form, setForm] = useState({
    move_out_date: "",
    reason: "selling",
    buyer_name: "",
    forwarding_email: "",
    forwarding_address: "",
    forwarding_phone: "",
    utility_info: "",
    keys_status: "pending",
    notes: "",
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // Check for unpaid dues whenever the sheet opens — outstanding balances
  // block self-service move-out so residents settle up or contact their HOA.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingDues(true);
    base44.entities.Invoice.filter({ homeowner_id: user?.id })
      .then((invs) => {
        if (cancelled) return;
        setDues((invs || []).filter((i) => i.status === "pending" || i.status === "overdue"));
      })
      .catch(() => { if (!cancelled) setDues([]); })
      .finally(() => { if (!cancelled) setLoadingDues(false); });
    return () => { cancelled = true; };
  }, [open, user]);

  const duesTotal = dues.reduce((s, i) => s + (i.amount || 0), 0);
  const hasDues = dues.length > 0;

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await base44.functions.invoke("process-move-out", form);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-medium hover:bg-destructive/90 transition-colors">
          <LogOut className="w-4 h-4" />
          Moving Out / Selling
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[92dvh] sm:max-w-xl sm:mx-auto sm:rounded-2xl">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle>Moving out of the community</DrawerTitle>
          <DrawerDescription>
            Let the HOA know you're leaving. Submitting this form removes your membership and access to this community.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-2 flex-1 space-y-4">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          {loadingDues ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking for outstanding dues…
            </div>
          ) : hasDues ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Outstanding dues must be resolved first</p>
                  <p className="text-destructive/90">
                    You have {dues.length} unpaid {dues.length === 1 ? "invoice" : "invoices"} totalling {formatCurrency(duesTotal)}.
                    Please pay your dues, or ask your HOA admin to remove your membership from the community.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {dues.slice(0, 4).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-sm bg-card rounded-md px-3 py-2">
                    <span className="capitalize truncate">{inv.type} — {inv.description}</span>
                    <span className="font-medium shrink-0 ml-2">{formatCurrency(inv.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="destructive" className="flex-1">
                  <Link to="/home/invoices"><Receipt className="w-4 h-4 mr-2" /> Pay my dues</Link>
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline" className="flex-1">Ask HOA admin instead</Button>
                </DrawerClose>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 text-sm text-primary">
              <KeyRound className="w-4 h-4 shrink-0" /> No outstanding dues — you're clear to submit your move-out.
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="mo-date">Move-out / closing date</Label>
              <Input id="mo-date" type="date" value={form.move_out_date} onChange={(e) => set("move_out_date", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Reason</Label>
              <DrawerSelect
                value={form.reason}
                onValueChange={(v) => set("reason", v)}
                title="Reason for moving out"
                className="mt-1.5"
                options={[
                  { value: "selling", label: "Selling the house" },
                  { value: "relocating", label: "Relocating" },
                  { value: "renting", label: "Renting out" },
                  { value: "other", label: "Other" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="mo-notes">Notes for the HOA (optional)</Label>
              <Textarea id="mo-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything else the HOA should know" className="mt-1.5" rows={3} />
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Once submitted, your membership and access to this community will be removed. This cannot be undone.</span>
          </div>
        </div>

        <DrawerFooter className="pt-3 border-t border-border safe-bottom">
          <Button onClick={submit} disabled={!form.move_out_date || submitting || hasDues || loadingDues} variant="destructive" className="w-full h-11">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            {hasDues ? "Resolve dues to continue" : "Submit & Leave Community"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full h-11">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}