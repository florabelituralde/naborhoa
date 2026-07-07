import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import CopyLinkButton from "@/components/CopyLinkButton";
import { formatCurrency, formatDate } from "@/lib/format";
import { Check, ChevronDown, Search, Filter, X, Loader2, Trash2 } from "lucide-react";

const TYPE_LABELS = { dues: "Dues", assessment: "Assessment", fee: "Fee", fine: "Fine" };
const STATUS_OPTIONS = ["pending", "paid", "confirmed", "overdue"];
const TYPE_OPTIONS = ["dues", "assessment", "fee", "fine"];

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function InvoiceListWithFilters({ invoices, homeowners, onConfirm, onDelete, confirmingId, actions, emptyMessage = "No invoices yet. Create one to get started." }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("type");
  const [collapsed, setCollapsed] = useState({});

  const ownerName = (id) => {
    const h = homeowners.find((o) => o.id === id);
    return h?.name || h?.email || "—";
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (typeFilter !== "all" && inv.type !== typeFilter) return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (dateFrom) {
        if (!inv.due_date || new Date(inv.due_date) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        if (!inv.due_date || new Date(inv.due_date) > new Date(dateTo)) return false;
      }
      if (q) {
        const hay = `${inv.description || ""} ${inv.type || ""} ${inv.property_address || ""} ${ownerName(inv.homeowner_id) || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, search, typeFilter, statusFilter, dateFrom, dateTo, homeowners]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const inv of filtered) {
      let key, label;
      if (groupBy === "type") {
        key = inv.type || "other";
        label = TYPE_LABELS[key] || "Other";
      } else if (groupBy === "status") {
        key = inv.status || "pending";
        label = key.charAt(0).toUpperCase() + key.slice(1);
      } else {
        const mk = monthKey(inv.due_date);
        key = mk || "no-date";
        label = mk ? monthLabel(mk) : "No due date";
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key).items.push(inv);
    }
    // sort groups: type by defined order, status by defined order, date descending
    const arr = Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
    if (groupBy === "type") {
      const order = [...TYPE_OPTIONS, "other"];
      arr.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    } else if (groupBy === "status") {
      arr.sort((a, b) => STATUS_OPTIONS.indexOf(a.key) - STATUS_OPTIONS.indexOf(b.key));
    } else {
      arr.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
    }
    // within group, newest first
    arr.forEach((g) => g.items.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    return arr;
  }, [filtered, groupBy]);

  const hasActiveFilters = search || typeFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo;
  const clearFilters = () => {
    setSearch(""); setTypeFilter("all"); setStatusFilter("all"); setDateFrom(""); setDateTo("");
  };

  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  if (invoices.length === 0) {
    return (
      <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-card rounded-2xl warm-shadow p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span>Filter & Search</span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-1">
            <Label className="text-xs">Search</Label>
            <div className="relative mt-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Description, owner, type…" className="pl-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Due from</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Due to</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Group by</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="type">Category</SelectItem>
                <SelectItem value="date">Due date (month)</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} of {invoices.length} invoices</p>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-10 text-center text-sm text-muted-foreground">
          No invoices match your filters.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const total = g.items.reduce((s, i) => s + (i.amount || 0), 0);
            const isCollapsed = collapsed[g.key];
            return (
              <div key={g.key} className="bg-card rounded-2xl warm-shadow overflow-hidden">
                <button
                  onClick={() => toggle(g.key)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    <h3 className="font-semibold">{g.label}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{g.items.length}</span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{formatCurrency(total)}</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y border-t">
                    {g.items.map((inv) => (
                      <div key={inv.id} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <StatusBadge status={inv.status} />
                            <span className="text-xs text-muted-foreground capitalize">{inv.type}</span>
                          </div>
                          <p className="text-sm font-medium truncate">{inv.description || "—"}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                            <span>{ownerName(inv.homeowner_id)}</span>
                            <span>Due: {formatDate(inv.due_date)}</span>
                            {inv.paid_date && <span>Paid: {formatDate(inv.paid_date)}</span>}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2 shrink-0">
                          <p className="text-lg font-bold">{formatCurrency(inv.amount)}</p>
                          {actions ? actions(inv) : (
                            <div className="flex items-center gap-2">
                              {inv.status === "pending" && (
                                <CopyLinkButton url={`${window.location.origin}/pay/invoice/${inv.id}`} label="Share" />
                              )}
                              {inv.status === "paid" && (
                                <Button size="sm" onClick={() => onConfirm(inv)} disabled={confirmingId === inv.id}>
                                  {confirmingId === inv.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                  {confirmingId === inv.id ? "Confirming" : "Confirm"}
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => onDelete(inv)} aria-label="Delete invoice">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}