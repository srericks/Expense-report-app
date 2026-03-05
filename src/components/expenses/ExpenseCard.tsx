"use client";

import { Pencil, Trash2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateDisplay } from "@/lib/utils/dates";
import type { SerializedExpense } from "@/lib/firestore/expenses";

interface ExpenseCardProps {
  expense: SerializedExpense;
  onEdit: (expense: SerializedExpense) => void;
  onDelete: (expenseId: string) => void;
}

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
          <Receipt className="w-5 h-5 text-brand-primary" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {expense.vendor}
            </p>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                statusStyles[expense.status] || statusStyles.draft
              )}
            >
              {expense.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">
              {formatDateDisplay(expense.date)}
            </span>
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-500 truncate">
              {expense.category}
            </span>
          </div>
          {expense.description && (
            <p className="text-xs text-gray-400 mt-1 truncate">
              {expense.description}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">
            {formatCurrency(expense.amount)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(expense)}
            className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
