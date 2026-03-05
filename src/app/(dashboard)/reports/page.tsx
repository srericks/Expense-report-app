"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileDown,
  Calendar,
  DollarSign,
  Hash,
  Trash2,
  Search,
  X,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";
import { useReports } from "@/lib/hooks/useReports";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateDisplay } from "@/lib/utils/dates";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import type { SerializedReport } from "@/types/report";

export default function ReportsPage() {
  const { reports, loading, error, deleteReport, toggleReimbursed } =
    useReports();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredReports = useMemo(() => {
    let filtered = reports;

    // Text search — matches business purpose, employee name, or department
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.businessPurpose.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q) ||
          r.deptLocation.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }

    // Date range filter — matches if the report's date range overlaps
    if (dateFrom) {
      filtered = filtered.filter((r) => r.endDate >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((r) => r.startDate <= dateTo);
    }

    return filtered;
  }, [reports, searchQuery, dateFrom, dateTo]);

  const reimbursementTally = useMemo(() => {
    const totalAll = filteredReports.reduce((sum, r) => sum + r.totalAmount, 0);
    const totalReimbursed = filteredReports
      .filter((r) => r.reimbursed)
      .reduce((sum, r) => sum + r.totalAmount, 0);
    const totalOwed = totalAll - totalReimbursed;
    const reimbursedCount = filteredReports.filter((r) => r.reimbursed).length;
    const owedCount = filteredReports.length - reimbursedCount;

    return { totalAll, totalReimbursed, totalOwed, reimbursedCount, owedCount };
  }, [filteredReports]);

  const hasActiveFilters = searchQuery || dateFrom || dateTo;

  function clearFilters() {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
  }

  async function handleDelete(reportId: string) {
    if (
      !confirm(
        "Delete this report? The expenses will be unlinked and appear in your Expenses page again."
      )
    ) {
      return;
    }
    setDeletingId(reportId);
    setDeleteError(null);
    try {
      await deleteReport(reportId);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete"
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleReimbursed(
    reportId: string,
    reimbursed: boolean
  ) {
    setTogglingId(reportId);
    try {
      await toggleReimbursed(reportId, reimbursed);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to update reimbursement"
      );
    } finally {
      setTogglingId(null);
    }
  }

  function handleDownload(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <p className="text-sm text-gray-500">
          View and download your finalized expense reports
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {deleteError}
        </div>
      )}

      {/* Search & Filter Bar */}
      {reports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Search reports
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, purpose, department..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                />
              </div>
            </div>

            {/* Date from */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
            </div>

            {/* Date to */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Result count */}
          {hasActiveFilters && (
            <p className="text-xs text-gray-400 mt-3">
              Showing {filteredReports.length} of {reports.length} report
              {reports.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Reimbursement Summary */}
      {filteredReports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Owed — PROMINENT */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
              Total Owed
            </p>
            <p className="text-3xl font-bold text-red-700">
              {formatCurrency(reimbursementTally.totalOwed)}
            </p>
            <p className="text-xs text-red-400 mt-1">
              {reimbursementTally.owedCount} report
              {reimbursementTally.owedCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Total Reimbursed */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">
              Reimbursed
            </p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(reimbursementTally.totalReimbursed)}
            </p>
            <p className="text-xs text-green-500 mt-1">
              {reimbursementTally.reimbursedCount} report
              {reimbursementTally.reimbursedCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Total Overall */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
              Total
            </p>
            <p className="text-2xl font-bold text-gray-800">
              {formatCurrency(reimbursementTally.totalAll)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {filteredReports.length} report
              {filteredReports.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">No reports yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Finalize your expenses on the Expenses page to create a report.
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">No matching reports</p>
          <p className="text-sm text-gray-400 mt-1">
            Try adjusting your search or date filters.
          </p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-brand-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDownloadExcel={() =>
                report.excelFileUrl && handleDownload(report.excelFileUrl)
              }
              onDownloadPdf={() =>
                report.receiptPdfUrl && handleDownload(report.receiptPdfUrl)
              }
              onDelete={() => handleDelete(report.id)}
              deleting={deletingId === report.id}
              onToggleReimbursed={(reimbursed) =>
                handleToggleReimbursed(report.id, reimbursed)
              }
              toggling={togglingId === report.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ReportCardProps {
  report: SerializedReport;
  onDownloadExcel: () => void;
  onDownloadPdf: () => void;
  onDelete: () => void;
  deleting: boolean;
  onToggleReimbursed: (reimbursed: boolean) => void;
  toggling: boolean;
}

function ReportCard({
  report,
  onDownloadExcel,
  onDownloadPdf,
  onDelete,
  deleting,
  onToggleReimbursed,
  toggling,
}: ReportCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5 hover:shadow-sm transition-shadow",
        report.reimbursed
          ? "bg-green-50/50 border-green-200"
          : "bg-white border-gray-200"
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base truncate">
            {report.businessPurpose || "Untitled Report"}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {report.employeeName}
            {report.deptLocation ? ` \u2014 ${report.deptLocation}` : ""}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2 shrink-0"
          title="Delete report"
        >
          {deleting ? (
            <Spinner size="sm" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {formatDateDisplay(report.startDate)} -{" "}
          {formatDateDisplay(report.endDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5" />
          {report.expenseCount} expense
          {report.expenseCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-gray-800">
          <DollarSign className="w-3.5 h-3.5" />
          {formatCurrency(report.totalAmount)}
        </span>
      </div>

      {/* Created date */}
      <p className="text-xs text-gray-400 mb-4">
        Created{" "}
        {new Date(report.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      {/* Reimbursement toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => onToggleReimbursed(!report.reimbursed)}
          disabled={toggling}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            report.reimbursed
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          {toggling ? (
            <Spinner size="sm" />
          ) : report.reimbursed ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <CircleDashed className="w-3.5 h-3.5" />
          )}
          {report.reimbursed ? "Reimbursed" : "Mark Reimbursed"}
        </button>
        {report.reimbursed && report.reimbursedAt && (
          <span className="text-xs text-gray-400">
            on{" "}
            {new Date(report.reimbursedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Download buttons */}
      <div className="flex items-center gap-2">
        {report.excelFileUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDownloadExcel}
            className="!text-green-700 !border-green-200 hover:!bg-green-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </Button>
        )}
        {report.receiptPdfUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDownloadPdf}
            className="!text-red-600 !border-red-200 hover:!bg-red-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            Receipts PDF
          </Button>
        )}
      </div>
    </div>
  );
}
