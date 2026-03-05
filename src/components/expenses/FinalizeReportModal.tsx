"use client";

import { useState, useRef } from "react";
import {
  CheckCircle,
  FileSpreadsheet,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fillExpenseTemplate } from "@/lib/utils/export-excel";
import { exportReceiptsPdf } from "@/lib/utils/export-receipts-pdf";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateDisplay } from "@/lib/utils/dates";
import Button from "@/components/ui/Button";
import type { SerializedExpense } from "@/lib/firestore/expenses";

interface ReportDetails {
  employeeName: string;
  title: string;
  deptLocation: string;
  businessPurpose: string;
  pointsOfTravel: string;
  startDate: string;
  endDate: string;
}

interface FinalizeReportModalProps {
  open: boolean;
  onClose: () => void;
  expenses: SerializedExpense[];
  reportDetails: ReportDetails;
  onFinalized: () => void;
}

type FinalizeStep = "confirm" | "template" | "processing" | "success" | "error";

export default function FinalizeReportModal({
  open,
  onClose,
  expenses,
  reportDetails,
  onFinalized,
}: FinalizeReportModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<FinalizeStep>("confirm");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const missingFields: string[] = [];
  if (!reportDetails.employeeName) missingFields.push("Employee Name");
  if (!reportDetails.businessPurpose) missingFields.push("Business Purpose");
  if (!reportDetails.startDate) missingFields.push("Start Date");
  if (!reportDetails.endDate) missingFields.push("End Date");

  function handleClose() {
    if (step === "processing") return; // don't allow close during processing
    setStep("confirm");
    setStatusMessage("");
    setErrorMessage("");
    onClose();
  }

  function handleProceedToTemplate() {
    setStep("template");
  }

  function handleSelectFile() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setErrorMessage("Please select an .xlsx file");
      return;
    }

    setErrorMessage("");
    e.target.value = "";
    await handleFinalize(file);
  }

  async function handleFinalize(templateFile: File) {
    if (!user) return;
    setStep("processing");

    try {
      const storage = getFirebaseStorage();
      const timestamp = Date.now();

      // Step 1: Generate the filled Excel blob
      setStatusMessage("Generating Excel report...");
      const excelBlob = await fillExpenseTemplate(
        templateFile,
        expenses,
        reportDetails
      );

      // Step 2: Generate the receipt PDF blob
      setStatusMessage("Generating receipt PDF...");
      const pdfBlob = await exportReceiptsPdf(expenses, {
        employeeName: reportDetails.employeeName,
        businessPurpose: reportDetails.businessPurpose,
        startDate: reportDetails.startDate,
        endDate: reportDetails.endDate,
      });

      // Step 3: Upload Excel to Firebase Storage
      setStatusMessage("Uploading Excel file...");
      const excelPath = `reports/${user.uid}/${timestamp}_expense_report.xlsx`;
      const excelRef = ref(storage, excelPath);
      await uploadBytes(excelRef, excelBlob);
      const excelFileUrl = await getDownloadURL(excelRef);

      // Step 4: Upload PDF to Firebase Storage
      setStatusMessage("Uploading receipt PDF...");
      const pdfPath = `reports/${user.uid}/${timestamp}_receipt_documentation.pdf`;
      const pdfRef = ref(storage, pdfPath);
      await uploadBytes(pdfRef, pdfBlob);
      const receiptPdfUrl = await getDownloadURL(pdfRef);

      // Step 5: Create report record via API
      setStatusMessage("Saving report...");
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: reportDetails.employeeName,
          title: reportDetails.title,
          deptLocation: reportDetails.deptLocation,
          businessPurpose: reportDetails.businessPurpose,
          pointsOfTravel: reportDetails.pointsOfTravel,
          startDate: reportDetails.startDate,
          endDate: reportDetails.endDate,
          expenseCount: expenses.length,
          totalAmount,
          excelFileUrl,
          receiptPdfUrl,
          expenseIds: expenses.map((e) => e.id),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save report");
      }

      setStep("success");
      onFinalized();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to finalize report"
      );
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-8">
        {/* Close button */}
        {step !== "processing" && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ---- Confirm Step ---- */}
        {step === "confirm" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Finalize Report
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              This will generate your Excel spreadsheet and receipt PDF, save
              them, and archive these expenses.
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Business Purpose</span>
                <span className="font-medium text-gray-900">
                  {reportDetails.businessPurpose || "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Employee</span>
                <span className="font-medium text-gray-900">
                  {reportDetails.employeeName || "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Trip Dates</span>
                <span className="font-medium text-gray-900">
                  {reportDetails.startDate && reportDetails.endDate
                    ? `${formatDateDisplay(reportDetails.startDate)} - ${formatDateDisplay(reportDetails.endDate)}`
                    : "—"}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                <span className="text-gray-500">Expenses</span>
                <span className="font-semibold text-gray-900">
                  {expenses.length} item{expenses.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Validation warnings */}
            {missingFields.length > 0 && (
              <div className="flex items-start gap-2 mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700">
                  Missing required fields: {missingFields.join(", ")}. Please
                  fill these in on the Report Details panel before finalizing.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleProceedToTemplate}
                disabled={missingFields.length > 0}
                className="!bg-green-600 hover:!bg-green-700 !px-6"
              >
                Next: Upload Template
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ---- Template Step ---- */}
        {step === "template" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Upload Excel Template
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Upload your blank{" "}
              <span className="font-semibold text-gray-800">
                Business Expense Report Log.xlsx
              </span>{" "}
              file. The system will fill it in and save both the Excel and
              receipt PDF to your reports.
            </p>

            {errorMessage && (
              <p className="text-sm text-red-600 mb-4">{errorMessage}</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setStep("confirm");
                  setErrorMessage("");
                }}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Back
              </button>
              <Button
                onClick={handleSelectFile}
                className="!bg-green-600 hover:!bg-green-700 !px-6"
              >
                Select File & Finalize
              </Button>
            </div>
          </div>
        )}

        {/* ---- Processing Step ---- */}
        {step === "processing" && (
          <div className="text-center py-4">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto mb-5" />

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Finalizing Report...
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              Please don&apos;t close this window.
            </p>
            <p className="text-sm font-medium text-brand-primary">
              {statusMessage}
            </p>
          </div>
        )}

        {/* ---- Success Step ---- */}
        {step === "success" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Report Finalized!
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Your expense report has been saved. You can download the Excel
              spreadsheet and receipt PDF anytime from the{" "}
              <span className="font-semibold text-gray-800">Reports</span>{" "}
              page.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handleClose}
                className="!bg-green-600 hover:!bg-green-700 !px-8"
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* ---- Error Step ---- */}
        {step === "error" && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Something Went Wrong
            </h3>
            <p className="text-sm text-red-600 mb-6">{errorMessage}</p>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
              <Button
                onClick={() => {
                  setStep("template");
                  setErrorMessage("");
                }}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
