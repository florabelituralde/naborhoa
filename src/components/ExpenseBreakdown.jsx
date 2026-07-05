import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { EXPENSE_CATEGORIES, getCategory } from "@/lib/expenseCategories";
import { formatCurrency } from "@/lib/format";

// Read-only visual breakdown of expenses by category. Shared by HOA + resident views.
export default function ExpenseBreakdown({ expenses }) {
  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const byCategory = EXPENSE_CATEGORIES.map(cat => {
    const amount = expenses
      .filter(e => e.category === cat.value)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { ...cat, amount };
  }).filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-48 h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="amount"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
              >
                {byCategory.map(c => <Cell key={c.value} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(val, name) => [formatCurrency(val), name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2">
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center">No spending recorded yet.</p>
          ) : (
            byCategory.map(c => {
              const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
              return (
                <div key={c.value} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm flex-1">{c.label}</span>
                  <span className="text-sm text-muted-foreground">{pct}%</span>
                  <span className="text-sm font-medium w-24 text-right">{formatCurrency(c.amount)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}