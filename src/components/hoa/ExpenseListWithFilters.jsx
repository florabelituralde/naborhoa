import React, { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { EXPENSE_CATEGORIES, getCategory } from "@/lib/expenseCategories";
import ListFilterBar from "@/components/shared/ListFilterBar";
import { ChevronDown, Paperclip, Trash2 } from "lucide-react";

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

  const filterFields = [
    { key: "categoryFilter", label: "Category", type: "select", options: EXPENSE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })) },
    { key: "dateFrom", label: "From", type: "date", span: 2 },
    { key: "dateTo", label: "To", type: "date", span: 2 },
  ];
  const filterValues = { categoryFilter, dateFrom, dateTo };
  const handleFilterChange = (key, val) => {
    if (key === "categoryFilter") setCategoryFilter(val);
    else if (key === "dateFrom") setDateFrom(val);
    else if (key === "dateTo") setDateTo(val);
  };

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
      <ListFilterBar
        search={search}
        setSearch={setSearch}
        fields={filterFields}
        values={filterValues}
        onChange={handleFilterChange}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        groupByOptions={[
          { value: "category", label: "Category" },
          { value: "month", label: "Date (month)" },
        ]}
        totalCount={expenses.length}
        filteredCount={filtered.length}
        onClear={clearFilters}
      />

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