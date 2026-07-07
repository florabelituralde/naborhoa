import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, UserCheck, MapPin, Check, X, Mail, CheckCheck } from "lucide-react";
import { format } from "date-fns";

export default function JoinRequestsSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const load = async () => {
    try {
      const res = await base44.functions.invoke("get-join-requests", {});
      setRequests(res.data?.requests || []);
    } catch {
      setRequests([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const process = async (request, action) => {
    setProcessingId(request.id);
    try {
      await base44.functions.invoke("process-join-request", { request_id: request.id, action });
      toast({ title: action === "approve" ? "Homeowner approved" : "Request declined" });
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r));
      setSelected(prev => { const n = new Set(prev); n.delete(request.id); return n; });
    } catch (err) {
      toast({ title: "Something went wrong", description: err.message, variant: "destructive" });
    }
    setProcessingId(null);
  };

  const bulkApprove = async (ids) => {
    const list = pending.filter(r => ids.includes(r.id));
    if (list.length === 0 || busy) return;
    setBusy(true);
    let ok = 0;
    const failed = [];
    await Promise.all(list.map(r =>
      base44.functions.invoke("process-join-request", { request_id: r.id, action: "approve" })
        .then(() => { ok++; })
        .catch(err => { failed.push(`${r.homeowner_name || r.id}: ${err.message || "failed"}`); })
    ));
    setRequests(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: "approved" } : r));
    setSelected(new Set());
    setBusy(false);
    if (ok) toast({ title: `${ok} request${ok === 1 ? "" : "s"} approved` });
    if (failed.length) toast({ title: `${failed.length} failed`, description: failed.join(", "), variant: "destructive" });
  };

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleAll = () => {
    if (selected.size === pending.length) setSelected(new Set());
    else setSelected(new Set(pending.map(r => r.id)));
  };

  const pending = requests.filter(r => r.status === "pending");
  const allSelected = pending.length > 0 && selected.size === pending.length;
  const someSelected = selected.size > 0;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl warm-shadow p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserCheck className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Membership Requests</h2>
        {pending.length > 0 && (
          <span className="ml-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">{pending.length}</span>
        )}
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No pending membership requests</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              Select all
            </label>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => bulkApprove(Array.from(selected))} disabled={!someSelected || busy}>
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-1" />}
                Approve Selected{someSelected ? ` (${selected.size})` : ""}
              </Button>
              <Button size="sm" onClick={() => bulkApprove(pending.map(r => r.id))} disabled={busy}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Approve All
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {pending.map(req => {
              const checked = selected.has(req.id);
              return (
                <div key={req.id} className={`p-4 rounded-xl border transition-colors ${checked ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(req.id)}
                        className="mt-1 w-4 h-4 rounded border-input accent-primary shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium">{req.homeowner_name || "New homeowner"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {req.homeowner_email}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> {req.address}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested {format(new Date(req.created_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => process(req, "approve")} disabled={processingId === req.id || busy} className="flex-1">
                      {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => process(req, "reject")} disabled={processingId === req.id || busy} className="flex-1">
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}