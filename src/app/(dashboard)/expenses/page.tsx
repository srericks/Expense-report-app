"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Plus,
  Sparkles,
  RotateCcw,
  CheckCircle,
  Download,
  Eye,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { useExpenses } from "@/lib/hooks/useExpenses";
import { useReceiptAnalysis } from "@/lib/hooks/useReceiptAnalysis";
import { useReceiptUpload } from "@/lib/hooks/useReceiptUpload";
import { toDollars } from "@/lib/utils/currency";
import { isBizMeal } from "@/lib/utils/categories";
import ReceiptUploadZone from "@/components/expenses/ReceiptUploadZone";
import ExpenseForm from "@/components/expenses/ExpenseForm";
import ExpenseTable from "@/components/expenses/ExpenseTable";
import ReportDetailsPanel from "@/components/expenses/ReportDetailsPanel";
import FinalizeReportModal from "@/components/expenses/FinalizeReportModal";
import PreviewReportModal from "@/components/expenses/PreviewReportModal";
import ReceiptReviewModal, {
  type ReceiptQueueItem,
} from "@/components/expenses/ReceiptReviewModal";
import Button from "@/components/ui/Button";
import type { SerializedExpense } from "@/lib/firestore/expenses";
import type { ExpenseCategory } from "@/types/expense";
import type { ReceiptAnalysisResult } from "@/lib/gemini/analyze-receipt";

/** Analyze a single file via the server API. */
async function analyzeReceiptSingle(
  file: File
): Promise<ReceiptAnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/receipts/analyze", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to analyze receipt");
  }
  const data = await res.json();
  return data.data as ReceiptAnalysisResult;
}

export default function ExpensesPage() {
  const { expenses, createExpense, updateExpense, deleteExpense, refetch } =
    useExpenses();
  const {
    analyzing,
    result,
    error: aiError,
    clearResult,
  } = useReceiptAnalysis();
  const { uploadReceipt } = useReceiptUpload();
  const { user } = useAuth();
  const { title: savedTitle, deptLocation: savedDeptLocation, loading: settingsLoading } = useBranding();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<SerializedExpense | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const uploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Review modal state
  const [reviewQueue, setReviewQueue] = useState<ReceiptQueueItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Report details state
  const [reportDetails, setReportDetails] = useState({
    employeeName: "",
    title: "",
    deptLocation: "",
    businessPurpose: "",
    pointsOfTravel: "",
    startDate: "",
    endDate: "",
  });

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      reviewQueue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-populate report details from user profile settings
  const hasPrePopulated = useRef(false);
  useEffect(() => {
    if (settingsLoading || hasPrePopulated.current) return;
    hasPrePopulated.current = true;

    setReportDetails((prev) => ({
      ...prev,
      employeeName: prev.employeeName || user?.displayName || "",
      title: prev.title || savedTitle || "",
      deptLocation: prev.deptLocation || savedDeptLocation || "",
    }));
  }, [settingsLoading, user?.displayName, savedTitle, savedDeptLocation]);

  // Filter out expenses that have already been finalized into a report
  const unreportedExpenses = useMemo(
    () => expenses.filter((e) => !e.reportId),
    [expenses]
  );

  // Split unreported expenses into travel and business meals
  const { travelExpenses, mealExpenses } = useMemo(() => {
    const travel: SerializedExpense[] = [];
    const meals: SerializedExpense[] = [];
    for (const exp of unreportedExpenses) {
      if (isBizMeal(exp.category as ExpenseCategory)) {
        meals.push(exp);
      } else {
        travel.push(exp);
      }
    }
    return { travelExpenses: travel, mealExpenses: meals };
  }, [unreportedExpenses]);

  // Build initial data for the form from AI analysis result (manual entry fallback)
  const aiFormData = result
    ? {
        date: result.date,
        vendor: result.vendor,
        amount: result.amount,
        category: result.category,
        description: result.description,
      }
    : undefined;

  // Build initial data for editing
  const editFormData = editingExpense
    ? {
        date: editingExpense.date,
        vendor: editingExpense.vendor,
        amount: toDollars(editingExpense.amount),
        category: editingExpense.category as ExpenseCategory,
        description: editingExpense.description || undefined,
        attendees: editingExpense.attendees || undefined,
      }
    : undefined;

  // ── Receipt upload → review modal flow ──────────────────────────

  async function handleFilesSelected(files: File[]) {
    setPageError(null);

    // Build queue items — one per file
    const queueItems: ReceiptQueueItem[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      analysisResult: null,
      uploadPromise: uploadReceipt(file),
      analyzing: true,
    }));

    setReviewQueue(queueItems);
    setReviewIndex(0);
    setReviewModalOpen(true);

    // Analyze each file sequentially, updating queue as results arrive
    for (let i = 0; i < files.length; i++) {
      try {
        const analysisResult = await analyzeReceiptSingle(files[i]);
        setReviewQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, analysisResult, analyzing: false }
              : item
          )
        );
      } catch (err) {
        console.error(`[ReceiptAnalyze] Analysis failed for file ${files[i].name}:`, err);
        const errorMsg = err instanceof Error ? err.message : "Failed to analyze receipt";
        setReviewQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, analyzing: false, error: errorMsg } : item
          )
        );
      }
    }
  }

  async function handleConfirmReceipt(data: {
    date: string;
    vendor: string;
    amount: number;
    category: string;
    description?: string;
    attendees?: string;
  }) {
    setSaving(true);
    setPageError(null);
    try {
      const currentItem = reviewQueue[reviewIndex];
      // Wait for the upload to finish and get the receipt URL
      const url = await currentItem.uploadPromise;
      await createExpense({ ...data, receiptUrl: url || undefined });

      // Advance to next item or close
      const nextIndex = reviewIndex + 1;
      if (nextIndex >= reviewQueue.length) {
        closeReviewModal();
      } else {
        setReviewIndex(nextIndex);
      }
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to save expense"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSkipReceipt() {
    const nextIndex = reviewIndex + 1;
    if (nextIndex >= reviewQueue.length) {
      closeReviewModal();
    } else {
      setReviewIndex(nextIndex);
    }
  }

  async function handleRetryAnalysis(index: number) {
    const item = reviewQueue[index];
    if (!item) return;

    // Mark as analyzing again
    setReviewQueue((prev) =>
      prev.map((q, idx) =>
        idx === index ? { ...q, analyzing: true, error: undefined, analysisResult: null } : q
      )
    );

    try {
      const analysisResult = await analyzeReceiptSingle(item.file);
      setReviewQueue((prev) =>
        prev.map((q, idx) =>
          idx === index ? { ...q, analysisResult, analyzing: false } : q
        )
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to analyze receipt";
      setReviewQueue((prev) =>
        prev.map((q, idx) =>
          idx === index ? { ...q, analyzing: false, error: errorMsg } : q
        )
      );
    }
  }

  function closeReviewModal() {
    setReviewModalOpen(false);
    // Clean up object URLs
    reviewQueue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setReviewQueue([]);
    setReviewIndex(0);
  }

  // ── Manual entry / edit flow (unchanged) ────────────────────────

  async function handleCreateExpense(data: {
    date: string;
    vendor: string;
    amount: number;
    category: string;
    description?: string;
    attendees?: string;
    receiptUrl?: string;
  }) {
    setSaving(true);
    setPageError(null);
    try {
      if (!data.receiptUrl && receiptUrl) {
        data.receiptUrl = receiptUrl;
      }
      await createExpense(data);
      setShowForm(false);
      setReceiptUrl(null);
      uploadPromiseRef.current = null;
      clearResult();
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to save expense"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateExpense(data: {
    date: string;
    vendor: string;
    amount: number;
    category: string;
    description?: string;
    attendees?: string;
    receiptUrl?: string;
  }) {
    if (!editingExpense) return;
    setSaving(true);
    setPageError(null);
    try {
      await updateExpense(editingExpense.id, data);
      setEditingExpense(null);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to update expense"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    setPageError(null);
    try {
      await deleteExpense(id);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to delete expense"
      );
    }
  }

  function handleEdit(expense: SerializedExpense) {
    setEditingExpense(expense);
    setShowForm(false);
    clearResult();
    setReceiptUrl(expense.receiptUrl || null);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingExpense(null);
    setReceiptUrl(null);
    clearResult();
  }

  function handleAddManual() {
    setShowForm(true);
    setEditingExpense(null);
    clearResult();
    setReceiptUrl(null);
  }

  async function handleClearData() {
    if (
      unreportedExpenses.length > 0 &&
      !window.confirm(
        `This will delete all ${unreportedExpenses.length} expense(s) and reset the report details. Continue?`
      )
    ) {
      return;
    }

    // Delete all unreported expenses
    setPageError(null);
    try {
      await Promise.all(unreportedExpenses.map((e) => deleteExpense(e.id)));
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to clear expenses"
      );
    }

    // Reset report details
    setReportDetails({
      employeeName: user?.displayName || "",
      title: savedTitle || "",
      deptLocation: savedDeptLocation || "",
      businessPurpose: "",
      pointsOfTravel: "",
      startDate: "",
      endDate: "",
    });
  }

  return (
    <div className="flex gap-8">
      {/* Left Panel - Report Details */}
      <ReportDetailsPanel
        details={reportDetails}
        onChange={setReportDetails}
      />

      {/* Right Panel - Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Expense Report Automator
            </h2>
            <p className="text-sm text-gray-500">
              Upload receipts and generate reports
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowPreviewModal(true)}
              disabled={unreportedExpenses.length === 0}
              className="!bg-[#001E61] hover:!bg-[#001845] !text-white"
            >
              <Eye className="w-4 h-4" />
              Preview Report
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const a = document.createElement("a");
                a.href = "/expense-template.xlsx";
                a.download = "2026 Business Expense Report Log.xlsx";
                a.click();
              }}
            >
              <Download className="w-4 h-4" />
              Download Template
            </Button>
            <Button variant="outline" onClick={handleClearData}>
              <RotateCcw className="w-4 h-4" />
              Clear Data
            </Button>
            <Button variant="outline" onClick={handleAddManual}>
              <Plus className="w-4 h-4" />
              Manual Entry
            </Button>
            <Button
              onClick={() => setShowFinalizeModal(true)}
              disabled={unreportedExpenses.length === 0}
              className="!bg-green-600 hover:!bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Finalize Report
            </Button>
          </div>
        </header>

        {/* AI confidence indicator (for manual entry fallback) */}
        {result && result.confidence > 0 && showForm && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <p className="text-sm text-brand-primary">
              AI extracted data with {Math.round(result.confidence * 100)}%
              confidence. Please review and adjust if needed.
            </p>
          </div>
        )}

        {/* Error messages */}
        {(pageError || aiError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {pageError || aiError}
          </div>
        )}

        {/* Create form (for manual entry only) */}
        {showForm && !editingExpense && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {result ? "Review Extracted Data" : "New Expense"}
            </h3>
            <ExpenseForm
              key={result ? `ai-${result.vendor}-${result.amount}` : "manual"}
              initialData={aiFormData}
              receiptUrl={receiptUrl || undefined}
              onSubmit={handleCreateExpense}
              onCancel={handleCancelForm}
              loading={saving}
              mode="create"
            />
          </div>
        )}

        {/* Edit form */}
        {editingExpense && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Edit Expense
            </h3>
            <ExpenseForm
              key={`edit-${editingExpense.id}`}
              initialData={editFormData}
              receiptUrl={receiptUrl || undefined}
              onSubmit={handleUpdateExpense}
              onCancel={handleCancelForm}
              loading={saving}
              mode="edit"
            />
          </div>
        )}

        {/* Receipt Upload Zone */}
        {!showForm && !editingExpense && (
          <ReceiptUploadZone
            onFilesSelected={handleFilesSelected}
            analyzing={analyzing || reviewModalOpen}
            className="mb-6"
          />
        )}

        {/* Expense Tables - Side by Side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ExpenseTable
            type="travel"
            expenses={travelExpenses}
            onEdit={handleEdit}
            onDelete={handleDeleteExpense}
          />
          <ExpenseTable
            type="business_meal"
            expenses={mealExpenses}
            onEdit={handleEdit}
            onDelete={handleDeleteExpense}
          />
        </div>
      </div>

      {/* Receipt Review Modal */}
      <ReceiptReviewModal
        open={reviewModalOpen}
        queue={reviewQueue}
        currentIndex={reviewIndex}
        onConfirm={handleConfirmReceipt}
        onSkip={handleSkipReceipt}
        onClose={closeReviewModal}
        onRetry={handleRetryAnalysis}
        saving={saving}
      />

      {/* Preview Report Modal */}
      <PreviewReportModal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        expenses={unreportedExpenses}
        reportDetails={reportDetails}
      />

      {/* Finalize Report Modal */}
      <FinalizeReportModal
        open={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        expenses={unreportedExpenses}
        reportDetails={reportDetails}
        onFinalized={() => {
          handleClearData();
          refetch();
        }}
      />
    </div>
  );
}
