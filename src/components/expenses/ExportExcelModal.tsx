"use client";

import { useState, useRef } from "react";
import { FileSpreadsheet, X } from "lucide-react";
import Button from "@/components/ui/Button";

interface ExportExcelModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (file: File) => Promise<void>;
}

export default function ExportExcelModal({
  open,
  onClose,
  onExport,
}: ExportExcelModalProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  async function handleSelectFile() {
    inputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setError("Please select an .xlsx file");
      return;
    }

    setError(null);
    setExporting(true);
    try {
      await onExport(file);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export"
      );
    } finally {
      setExporting(false);
      // Reset input
      e.target.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8 text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
          <FileSpreadsheet className="w-8 h-8 text-green-600" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          Export to Excel
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Please upload your blank{" "}
          <span className="font-semibold text-gray-800">
            2026 Business Expense Report Log.xlsx
          </span>{" "}
          file. The system will automatically fill in the dates, expenses, and
          totals.
        </p>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Buttons */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <Button
            onClick={handleSelectFile}
            loading={exporting}
            className="!bg-green-600 hover:!bg-green-700 !px-6"
          >
            Select File &amp; Export
          </Button>
        </div>
      </div>
    </div>
  );
}
