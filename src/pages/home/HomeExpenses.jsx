import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import ExpenseBreakdown from "@/components/ExpenseBreakdown";
import { Loader2 } from "lucide-react";
import ExpenseListWithFilters from "@/components/hoa/ExpenseListWithFilters";

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

      {expenses.length > 0 && (
        <div className="mb-6">
          <ExpenseBreakdown expenses={expenses} />
        </div>
      )}

      <ExpenseListWithFilters expenses={expenses} />
    </div>
  );
}