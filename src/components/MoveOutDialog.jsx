import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DrawerSelect from "@/components/mobile/DrawerSelect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";

export default function MoveOutDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    move_out_date: "",
    reason: "selling",
    buyer_name: "",
    forwarding_email: "",
    notes: "",
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-medium hover:bg-destructive/90 transition-colors">
          <LogOut className="w-4 h-4" />
          Moving Out / Selling
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Moving out of the community</DialogTitle>
          <DialogDescription>
            Let the HOA know you're leaving. Submitting this form will remove your membership and access to this community.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <Label htmlFor="mo-date">Move-out / closing date</Label>
            <Input id="mo-date" type="date" value={form.move_out_date} onChange={e => set("move_out_date", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Reason</Label>
            <DrawerSelect
              value={form.reason}
              onValueChange={v => set("reason", v)}
              title="Reason for moving out"
              className="mt-1.5"
              options={[
                { value: "selling", label: "Selling the house" },
                { value: "relocating", label: "Relocating" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="mo-buyer">New owner / buyer name (optional)</Label>
            <Input id="mo-buyer" value={form.buyer_name} onChange={e => set("buyer_name", e.target.value)} placeholder="Jane Smith" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="mo-email">Forwarding email (optional)</Label>
            <Input id="mo-email" type="email" value={form.forwarding_email} onChange={e => set("forwarding_email", e.target.value)} placeholder="you@example.com" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="mo-notes">Notes for the HOA (optional)</Label>
            <Textarea id="mo-notes" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Anything the HOA should know" className="mt-1.5" rows={3} />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Once submitted, your membership and access to this community will be removed. This cannot be undone.</span>
          </div>

          <Button onClick={submit} disabled={!form.move_out_date || submitting} variant="destructive" className="w-full h-11">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            Submit & Leave Community
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}