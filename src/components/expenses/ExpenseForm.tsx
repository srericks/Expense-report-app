"use client";

import { useState, type FormEvent } from "react";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/types/expense";
import { isBizMeal } from "@/lib/utils/categories";
import { todayISO } from "@/lib/utils/dates";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

interface ExpenseFormData {
  date: string;
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  attendees?: string;
}

interface ExpenseFormProps {
  initialData?: Partial<ExpenseFormData>;
  receiptUrl?: string;
  onSubmit: (data: ExpenseFormData & { receiptUrl?: string }) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  mode?: "create" | "edit";
}

const categoryOptions = EXPENSE_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat,
}));

export default function ExpenseForm({
  initialData,
  receiptUrl,
  onSubmit,
  onCancel,
  loading = false,
  mode = "create",
}: ExpenseFormProps) {
  const [date, setDate] = useState(initialData?.date || todayISO());
  const [vendor, setVendor] = useState(initialData?.vendor || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [category, setCategory] = useState<ExpenseCategory>(
    initialData?.category || "Other Allowable Expenses"
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [attendees, setAttendees] = useState(initialData?.attendees || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // NOTE: To re-initialize this form with new data (e.g. from AI analysis),
  // the parent should change the `key` prop to force a re-mount.

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!date) newErrors.date = "Date is required";
    if (!vendor.trim()) newErrors.vendor = "Vendor is required";

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = "Valid amount is required";
    }

    if (isBizMeal(category) && !attendees.trim()) {
      newErrors.attendees = "Attendees are required for business meals";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      date,
      vendor: vendor.trim(),
      amount: parseFloat(amount),
      category,
      description: description.trim() || undefined,
      attendees: attendees.trim() || undefined,
      receiptUrl: receiptUrl || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          required
        />
        <Input
          id="vendor"
          label="Vendor"
          type="text"
          placeholder="e.g. Hilton Hotels"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          error={errors.vendor}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="amount"
          label="Amount ($)"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          required
        />
        <Select
          id="category"
          label="Category"
          options={categoryOptions}
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
        />
      </div>

      <Textarea
        id="description"
        label="Description (optional)"
        placeholder="Brief description of the expense"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={500}
      />

      {isBizMeal(category) && (
        <Textarea
          id="attendees"
          label="Attendees"
          placeholder="List of attendees at the business meal"
          value={attendees}
          onChange={(e) => setAttendees(e.target.value)}
          error={errors.attendees}
          maxLength={500}
        />
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {mode === "create" ? "Save Expense" : "Update Expense"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
