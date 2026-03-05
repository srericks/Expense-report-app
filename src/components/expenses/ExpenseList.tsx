"use client";

import { Receipt } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import ExpenseCard from "./ExpenseCard";
import { formatCurrency } from "@/lib/utils/currency";
import type { SerializedExpense } from "@/lib/firestore/expenses";

interface ExpenseListProps {
  expenses: SerializedExpense[];
  loading: boolean;
  onEdit: (expense: SerializedExpense) => void;
  onDelete: (expenseId: string) => void;
}

export default function ExpenseList({
  expenses,
  loading,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-lg font-medium text-gray-400">No expenses yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a receipt or add an expense manually to get started
        </p>
      </div>
    );
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
        </p>
        <p className="text-sm font-semibold text-gray-700">
          Total: {formatCurrency(total)}
        </p>
      </div>
      <div className="space-y-2">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
