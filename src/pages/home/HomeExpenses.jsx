import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import ExpenseBreakdown from "@/components/ExpenseBreakdown";
import { Loader2, Wallet, Paperclip } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/format";
import { getCategory } from "@/lib/expenseCategories";

export default function HomeExpenses() {
  const { community } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (!community) {
      setLoading(false);
      return;
    }
    setLoading(true);
    base44.entities.Expense.filter({ community_id: community.id }, "-expense_date")
      .then(list => setExpenses(list))
      .finally(() => setLoading(false));
  }, [community]);

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <PageHeader title="Community Finances" subtitle={`See how ${community?.name} spends its funds`} />

      {expenses.length === 0 ? (
        <div className="bg-card rounded-2xl warm-shadow p-12 text-center">
          <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No expenses have been published yet</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <ExpenseBreakdown expenses={expenses} />
          </div>

          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">All Expenses</h2>
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
                  <span className="font-bold shrink-0">{formatCurrency(exp.amount)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}