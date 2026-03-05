"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X, Table, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateDisplay } from "@/lib/utils/dates";
import { EXCEL_COLUMN_MAP, isBizMeal } from "@/lib/utils/categories";
import type { SerializedExpense } from "@/lib/firestore/expenses";
import type { ExpenseCategory } from "@/types/expense";

interface ReportDetails {
  employeeName: string;
  title: string;
  deptLocation: string;
  businessPurpose: string;
  pointsOfTravel: string;
  startDate: string;
  endDate: string;
}

interface PreviewReportModalProps {
  open: boolean;
  onClose: () => void;
  expenses: SerializedExpense[];
  reportDetails: ReportDetails;
}

type PreviewTab = "summary" | "receipts";

const CATEGORY_COLUMNS = [
  { key: 5, label: "Mileage" },
  { key: 6, label: "Car Rental" },
  { key: 7, label: "Rental Car Fuel" },
  { key: 8, label: "Tolls/Parking" },
  { key: 9, label: "Airfare" },
  { key: 10, label: "Taxi" },
  { key: 11, label: "Personal Meals" },
  { key: 12, label: "Hotel" },
] as const;

const RECEIPT_CATEGORY_ORDER: ExpenseCategory[] = [
  "Mileage ($ Amount)",
  "Car Rental",
  "Rental Car Fuel",
  "Tolls/Parking",
  "Airfare",
  "Taxi",
  "Personal Meals",
  "Hotel",
  "Other Allowable Expenses",
  "Business Meals/Entertainment",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Supporting Documentation": "bg-slate-600",
  "Mileage ($ Amount)": "bg-blue-600",
  "Car Rental": "bg-indigo-600",
  "Rental Car Fuel": "bg-violet-600",
  "Tolls/Parking": "bg-purple-600",
  "Airfare": "bg-sky-600",
  "Taxi": "bg-cyan-600",
  "Personal Meals": "bg-teal-600",
  "Hotel": "bg-emerald-600",
  "Other Allowable Expenses": "bg-amber-600",
  "Business Meals/Entertainment": "bg-rose-600",
};

/**
 * Renders a receipt thumbnail — handles both images and PDFs.
 * For PDFs, fetches the file and renders the first page to a canvas via pdf.js.
 */
function ReceiptThumbnail({ url, alt }: { url: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      try {
        // Fetch via server proxy to avoid CORS
        const res = await fetch(
          `/api/receipts/image?url=${encodeURIComponent(url)}`
        );
        if (!res.ok) return;

        const blob = await res.blob();
        if (blob.type !== "application/pdf") return;
        if (cancelled) return;

        setIsPdf(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjsLib: any = await import(
          /* webpackIgnore: true */ "/pdf.min.mjs"
        );
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }

        const arrayBuffer = await blob.arrayBuffer();
        const pdfDoc = await pdfjsLib
          .getDocument({ data: new Uint8Array(arrayBuffer) })
          .promise;
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) {
          pdfDoc.destroy();
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          pdfDoc.destroy();
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        page.cleanup();
        pdfDoc.destroy();
        if (!cancelled) setLoaded(true);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // For PDFs, show the canvas
  if (isPdf) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
        {!loaded && !error && (
          <span className="text-xs text-gray-400">Loading PDF...</span>
        )}
        {error && (
          <span className="text-xs text-gray-400">PDF preview unavailable</span>
        )}
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full h-full object-contain",
            !loaded && "hidden"
          )}
        />
      </div>
    );
  }

  // For images, use a regular <img> tag
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

export default function PreviewReportModal({
  open,
  onClose,
  expenses,
  reportDetails,
}: PreviewReportModalProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("summary");

  // ── Travel & Meal data for Expense Summary tab ──
  const { travelRows, mealRows, travelTotal, mealTotal, grandTotal } =
    useMemo(() => {
      const nonMealTravel = expenses
        .filter(
          (e) =>
            !isBizMeal(e.category as ExpenseCategory) &&
            e.category !== "Personal Meals"
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      const personalMeals = expenses
        .filter((e) => e.category === "Personal Meals")
        .sort((a, b) => a.date.localeCompare(b.date));

      const bizMeals = expenses
        .filter((e) => isBizMeal(e.category as ExpenseCategory))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Group travel + personal meals by date
      type ColEntry = { amount: number; description: string };
      const travelByDate = new Map<string, Map<number | "other", ColEntry>>();

      for (const expense of [...nonMealTravel, ...personalMeals]) {
        if (!travelByDate.has(expense.date)) {
          travelByDate.set(expense.date, new Map());
        }
        const colMap = travelByDate.get(expense.date)!;
        const categoryCol =
          EXCEL_COLUMN_MAP[expense.category as ExpenseCategory];
        const key: number | "other" = categoryCol ?? "other";
        const existing = colMap.get(key) ?? { amount: 0, description: "" };
        colMap.set(key, {
          amount: existing.amount + expense.amount,
          description:
            existing.description || expense.description || expense.category,
        });
      }

      const sortedDates = Array.from(travelByDate.keys()).sort();

      const tRows = sortedDates.map((date) => {
        const colMap = travelByDate.get(date)!;
        const cells: Record<number | string, number> = {};
        let rowTotal = 0;
        for (const [key, { amount }] of colMap.entries()) {
          cells[key] = amount;
          rowTotal += amount;
        }
        const otherEntry = colMap.get("other");
        return {
          date,
          cells,
          otherDescription: otherEntry?.description || "",
          otherAmount: otherEntry?.amount || 0,
          rowTotal,
        };
      });

      const mRows = bizMeals.map((e) => ({
        date: e.date,
        vendor: e.vendor,
        attendees: e.attendees || "",
        amount: e.amount,
      }));

      const tTotal = tRows.reduce((sum, r) => sum + r.rowTotal, 0);
      const mTotal = mRows.reduce((sum, r) => sum + r.amount, 0);

      return {
        travelRows: tRows,
        mealRows: mRows,
        travelTotal: tTotal,
        mealTotal: mTotal,
        grandTotal: tTotal + mTotal,
      };
    }, [expenses]);

  // ── Receipt sections for Receipts tab ──
  const receiptSections = useMemo(() => {
    const sections: { category: string; items: SerializedExpense[] }[] = [];

    // Supporting Documentation first
    const supportDocs = expenses
      .filter((e) => e.category === "Supporting Documentation" && e.receiptUrl)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (supportDocs.length > 0) {
      sections.push({ category: "Supporting Documentation", items: supportDocs });
    }

    for (const category of RECEIPT_CATEGORY_ORDER) {
      const items = expenses
        .filter((e) => e.category === category && e.receiptUrl)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (items.length > 0) {
        sections.push({ category, items });
      }
    }

    return sections;
  }, [expenses]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-6xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header with tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Preview Report</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("summary")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                activeTab === "summary"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Table className="w-4 h-4" />
              Expense Summary
            </button>
            <button
              onClick={() => setActiveTab("receipts")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                activeTab === "receipts"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Receipts
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-6">
          {activeTab === "summary" && (
            <div>
              {/* Report header info */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 px-1">
                <div className="text-sm">
                  <span className="text-gray-500">Employee:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {reportDetails.employeeName || "---"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Title:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {reportDetails.title || "---"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Dept / Location:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {reportDetails.deptLocation || "---"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Business Purpose:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {reportDetails.businessPurpose || "---"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Points of Travel:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {reportDetails.pointsOfTravel || "---"}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Dates:</span>{" "}
                  <span className="font-medium text-gray-900">
                    {reportDetails.startDate && reportDetails.endDate
                      ? `${formatDateDisplay(reportDetails.startDate)} – ${formatDateDisplay(reportDetails.endDate)}`
                      : "---"}
                  </span>
                </div>
              </div>

              {/* Travel Expenses Table */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-2">
                  Travel Expenses
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">
                          Date
                        </th>
                        {CATEGORY_COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            className="text-right px-2 py-2 font-semibold text-gray-600 whitespace-nowrap"
                          >
                            {col.label}
                          </th>
                        ))}
                        <th className="text-left px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">
                          Other
                        </th>
                        <th className="text-right px-2 py-2 font-semibold text-gray-600 whitespace-nowrap">
                          Other $
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">
                          Daily Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {travelRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={12}
                            className="px-3 py-4 text-center text-gray-400"
                          >
                            No travel expenses
                          </td>
                        </tr>
                      ) : (
                        travelRows.map((row, i) => (
                          <tr
                            key={row.date + i}
                            className="border-b border-gray-100 last:border-b-0"
                          >
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {formatDateDisplay(row.date)}
                            </td>
                            {CATEGORY_COLUMNS.map((col) => (
                              <td
                                key={col.key}
                                className="px-2 py-2 text-right text-gray-700 whitespace-nowrap"
                              >
                                {row.cells[col.key]
                                  ? formatCurrency(row.cells[col.key])
                                  : ""}
                              </td>
                            ))}
                            <td
                              className="px-2 py-2 text-gray-600 truncate max-w-[100px]"
                              title={row.otherDescription}
                            >
                              {row.otherDescription}
                            </td>
                            <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">
                              {row.otherAmount
                                ? formatCurrency(row.otherAmount)
                                : ""}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                              {formatCurrency(row.rowTotal)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {travelRows.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 border-t border-gray-200">
                          <td
                            colSpan={11}
                            className="px-3 py-2 text-right text-xs font-bold text-gray-700"
                          >
                            Travel Subtotal
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                            {formatCurrency(travelTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Business Meals Table */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-800 mb-2">
                  Business Meals / Entertainment
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">
                          Date
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">
                          Restaurant
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-600">
                          Attendees
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-600">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mealRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-4 text-center text-gray-400"
                          >
                            No business meals
                          </td>
                        </tr>
                      ) : (
                        mealRows.map((row, i) => (
                          <tr
                            key={row.date + i}
                            className="border-b border-gray-100 last:border-b-0"
                          >
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {formatDateDisplay(row.date)}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {row.vendor}
                            </td>
                            <td
                              className="px-3 py-2 text-gray-600 truncate max-w-[200px]"
                              title={row.attendees}
                            >
                              {row.attendees || "---"}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                              {formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {mealRows.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 border-t border-gray-200">
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-right text-xs font-bold text-gray-700"
                          >
                            Meals Subtotal
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">
                            {formatCurrency(mealTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex justify-end px-1">
                <div className="bg-gray-50 rounded-lg px-6 py-3 border border-gray-200">
                  <span className="text-sm font-bold text-gray-700">
                    Grand Total:{" "}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "receipts" && (
            <div className="space-y-6">
              {receiptSections.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No receipts to display</p>
                </div>
              ) : (
                receiptSections.map((section) => (
                  <div key={section.category}>
                    {/* Category header badge */}
                    <div
                      className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold text-white mb-3",
                        CATEGORY_COLORS[section.category] || "bg-gray-600"
                      )}
                    >
                      {section.category}
                    </div>

                    {/* Receipt grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {section.items.map((expense) => (
                        <div
                          key={expense.id}
                          className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow"
                        >
                          {/* Thumbnail */}
                          <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                            {expense.receiptUrl ? (
                              <ReceiptThumbnail
                                url={expense.receiptUrl}
                                alt={`Receipt: ${expense.vendor}`}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="px-3 py-2">
                            <p className="text-xs text-gray-500">
                              {formatDateDisplay(expense.date)}
                            </p>
                            <p
                              className="text-sm font-medium text-gray-800 truncate"
                              title={expense.vendor}
                            >
                              {expense.vendor}
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
