import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { EXPENSE_CATEGORIES, getCategory } from "@/lib/expenseCategories";
import { ChevronDown, Search, Filter, X, Paperclip, Trash2 } from "lucide-react";

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

export default function ExpenseListWithFilters({ expenses, canDelete = false, onDelete }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("category");
  const [collapsed, setCollapsed] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((exp) => {
      if (categoryFilter !== "all" && exp.category !== categoryFilter) return false;
      if (dateFrom) {
        if (!exp.expense_date || new Date(exp.expense_date) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        if (!exp.expense_date || new Date(exp.expense_date) > new Date(dateTo)) return false;
      }
      if (q) {
        const hay = `${exp.title || ""} ${exp.description || ""} ${exp.vendor || ""} ${exp.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, search, categoryFilter, dateFrom, dateTo]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const exp of filtered) {
      let key, label;
      if (groupBy === "category") {
        key = exp.category || "other";
        label = getCategory(key).label;
      } else {
        const mk = monthKey(exp.expense_date);
        key = mk || "no-date";
        label = mk ? monthLabel(mk) : "No date";
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key).items.push(exp);
    }
    const arr = Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
    if (groupBy === "category") {
      const order = EXPENSE_CATEGORIES.map((c) => c.value);
      arr.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
    } else {
      arr.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
    }
    arr.forEach((g) => g.items.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date)));
    return arr;
  }, [filtered, groupBy]);

  const hasActiveFilters = search || categoryFilter !== "all" || dateFrom || dateTo;
  const advancedCount = (categoryFilter !== "all" ? 1 : 0) + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);
  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setDateFrom(""); setDateTo(""); };
  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  if (expenses.length === 0) {
    return (
      <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
        <p className="text-muted-foreground">No expenses recorded yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-card rounded-2xl warm-shadow p-4 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, vendor, notes…" className="pl-9" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="sm:hidden inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border bg-background"
          >
            <Filter className="w-4 h-4" />
            Filters
            {advancedCount > 0 && <span className="ml-0.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">{advancedCount}</span>}
          </button>
          <span className="hidden sm:flex items-center gap-2 text-sm font-medium">
            <Filter className="w-4 h-4 text-muted-foreground" />
            Filter &amp; Search
          </span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
        <div className={`${showFilters ? "grid" : "hidden"} grid-cols-2 sm:grid sm:grid-cols-3 gap-3 mt-3`}>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Group by</Label>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="month">Date (month)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} of {expenses.length} expenses</p>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-10 text-center text-sm text-muted-foreground">
          No expenses match your filters.
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
                    {g.items.map((exp) => {
                      const cat = getCategory(exp.category);
                      return (
                        <div key={exp.id} className="px-5 py-4 flex items-start justify-between gap-4">
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
                            {canDelete && onDelete && (
                              <button onClick={() => onDelete(exp.id)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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