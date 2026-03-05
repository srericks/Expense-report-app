"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Check, SkipForward, FileText, Loader2, RotateCcw } from "lucide-react";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/types/expense";
import { isBizMeal } from "@/lib/utils/categories";
import { todayISO } from "@/lib/utils/dates";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import type { ReceiptAnalysisResult } from "@/lib/gemini/analyze-receipt";

export interface ReceiptQueueItem {
  file: File;
  previewUrl: string;
  analysisResult: ReceiptAnalysisResult | null;
  uploadPromise: Promise<string | null>;
  analyzing: boolean;
  error?: string;
}

interface ReceiptReviewModalProps {
  open: boolean;
  queue: ReceiptQueueItem[];
  currentIndex: number;
  onConfirm: (data: {
    date: string;
    vendor: string;
    amount: number;
    category: string;
    description?: string;
    attendees?: string;
  }) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
  onRetry: (index: number) => void;
  saving: boolean;
}

const categoryOptions = EXPENSE_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat,
}));

export default function ReceiptReviewModal({
  open,
  queue,
  currentIndex,
  onConfirm,
  onSkip,
  onClose,
  onRetry,
  saving,
}: ReceiptReviewModalProps) {
  const [date, setDate] = useState(todayISO());
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Other Allowable Expenses");
  const [description, setDescription] = useState("");
  const [attendees, setAttendees] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const current = queue[currentIndex];
  const remaining = queue.length - currentIndex;

  // Re-initialize form fields when the current item changes or analysis completes
  useEffect(() => {
    if (!current) return;
    const r = current.analysisResult;
    if (r) {
      setDate(r.date || todayISO());
      setVendor(r.vendor || "");
      setAmount(r.amount ? r.amount.toFixed(2) : "");
      setCategory(r.category || "Other Allowable Expenses");
      setDescription(r.description || "");
      setAttendees("");
      setErrors({});
    } else if (!current.analyzing) {
      // Analysis failed — reset to empty defaults
      setDate(todayISO());
      setVendor("");
      setAmount("");
      setCategory("Other Allowable Expenses");
      setDescription("");
      setAttendees("");
      setErrors({});
    }
  }, [currentIndex, current?.analysisResult, current?.analyzing]);

  if (!open || !current) return null;

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
    await onConfirm({
      date,
      vendor: vendor.trim(),
      amount: parseFloat(amount),
      category,
      description: description.trim() || undefined,
      attendees: attendees.trim() || undefined,
    });
  }

  const isImage = current.file.type.startsWith("image/");
  const isPdf = current.file.type === "application/pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-brand-primary text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <h3 className="text-lg font-bold">Review Item</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20">
              {remaining} left
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Receipt Preview */}
            <div className="md:w-2/5 flex-shrink-0">
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden" style={{ minHeight: 300 }}>
                {isImage && (
                  <img
                    src={current.previewUrl}
                    alt={current.file.name}
                    className="w-full h-full object-contain"
                    style={{ maxHeight: 400 }}
                  />
                )}
                {isPdf && (
                  <iframe
                    src={current.previewUrl}
                    title={current.file.name}
                    className="w-full border-0"
                    style={{ height: 400 }}
                  />
                )}
                {!isImage && !isPdf && (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <FileText className="w-12 h-12 mb-2" />
                    <p className="text-sm">{current.file.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Form Fields */}
            <div className="md:w-3/5">
              {current.analyzing ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-primary mb-3" />
                  <p className="text-sm font-medium">Analyzing receipt...</p>
                  <p className="text-xs text-gray-400 mt-1">Extracting date, vendor, and amount</p>
                </div>
              ) : (
                <form id="review-form" onSubmit={handleSubmit} className="space-y-4">
                  {!current.analysisResult && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      <span>{current.error || "AI analysis could not extract data from this receipt. Please fill in the fields manually."}</span>
                      <button
                        type="button"
                        onClick={() => onRetry(currentIndex)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded transition-colors whitespace-nowrap"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      id="review-date"
                      label="Date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      error={errors.date}
                      required
                    />
                    <Input
                      id="review-amount"
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
                  </div>

                  <Input
                    id="review-vendor"
                    label="Vendor"
                    type="text"
                    placeholder="e.g. Hilton Hotels"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    error={errors.vendor}
                    required
                  />

                  <Select
                    id="review-category"
                    label="Category"
                    options={categoryOptions}
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  />

                  <Input
                    id="review-description"
                    label="Description"
                    type="text"
                    placeholder="Brief description of the expense"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />

                  {isBizMeal(category) && (
                    <Textarea
                      id="review-attendees"
                      label="Attendees"
                      placeholder="List of attendees at the business meal"
                      value={attendees}
                      onChange={(e) => setAttendees(e.target.value)}
                      error={errors.attendees}
                      maxLength={500}
                    />
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!current.analyzing && (
          <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-gray-100">
            <Button
              type="submit"
              form="review-form"
              loading={saving}
              className="!px-8"
            >
              <Check className="w-4 h-4" />
              Confirm &amp; Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
