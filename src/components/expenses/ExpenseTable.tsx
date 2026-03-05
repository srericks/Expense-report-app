"use client";

import { Plane, UtensilsCrossed, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateDisplay } from "@/lib/utils/dates";
import type { SerializedExpense } from "@/lib/firestore/expenses";

interface ExpenseTableProps {
  type: "travel" | "business_meal";
  expenses: SerializedExpense[];
  onEdit: (expense: SerializedExpense) => void;
  onDelete: (expenseId: string) => void;
}

export default function ExpenseTable({
  type,
  expenses,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const isTravel = type === "travel";
  const Icon = isTravel ? Plane : UtensilsCrossed;
  const title = isTravel ? "Travel Expenses" : "Business Meals";
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <Icon className="w-5 h-5 text-brand-primary" />
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        </div>
        <span className="text-sm font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg">
          {formatCurrency(total)}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                Date
              </th>
              <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">
                Vendor
              </th>
              {isTravel ? (
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">
                  Category
                </th>
              ) : (
                <th className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">
                  Attendees
                </th>
              )}
              <th className="text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">
                Amount
              </th>
              <th className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center">
                  <p className="text-sm text-gray-400">No {isTravel ? "travel expenses" : "business meals"} yet</p>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="text-sm text-gray-600 px-5 py-3 whitespace-nowrap">
                    {formatDateDisplay(expense.date)}
                  </td>
                  <td className="text-sm text-gray-800 font-medium px-3 py-3 truncate max-w-[160px]">
                    {expense.vendor}
                  </td>
                  {isTravel ? (
                    <td className="text-sm text-gray-600 px-3 py-3 truncate max-w-[140px]">
                      {expense.category}
                    </td>
                  ) : (
                    <td className="text-sm text-gray-600 px-3 py-3 truncate max-w-[140px]">
                      {expense.attendees || "—"}
                    </td>
                  )}
                  <td className="text-sm font-semibold text-gray-800 text-right px-3 py-3 whitespace-nowrap">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(expense.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
