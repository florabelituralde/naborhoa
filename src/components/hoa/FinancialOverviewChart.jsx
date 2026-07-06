import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthIndex(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : { m: d.getMonth(), y: d.getFullYear() };
}

// Year-to-date income (paid/confirmed invoices) vs. expenses, by month.
export default function FinancialOverviewChart({ invoices = [], expenses = [] }) {
  const year = new Date().getFullYear();

  const { data, totalIncome, totalExpenses } = useMemo(() => {
    const rows = MONTHS.map((label) => ({ month: label, Income: 0, Expenses: 0 }));

    invoices.forEach((inv) => {
      if (inv.status !== "paid" && inv.status !== "confirmed") return;
      const ref = monthIndex(inv.paid_date || inv.due_date);
      if (ref && ref.y === year) rows[ref.m].Income += inv.amount || 0;
    });
    expenses.forEach((exp) => {
      const ref = monthIndex(exp.expense_date);
      if (ref && ref.y === year) rows[ref.m].Expenses += exp.amount || 0;
    });

    return {
      data: rows,
      totalIncome: rows.reduce((s, r) => s + r.Income, 0),
      totalExpenses: rows.reduce((s, r) => s + r.Expenses, 0),
    };
  }, [invoices, expenses, year]);

  const net = totalIncome - totalExpenses;

  return (
    <div className="bg-card rounded-2xl warm-shadow p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Financial Overview · {year}
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="font-semibold text-primary">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="font-semibold text-[#c17f59]">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`font-semibold ${net >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(net)}</p>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={48}
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)} />
            <Tooltip
              formatter={(v) => formatCurrency(v)}
              contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 13 }}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            />
            <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
            <Bar dataKey="Income" fill="#6a9078" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Expenses" fill="#c17f59" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}