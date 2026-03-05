import jsPDF from "jspdf";
import { toDollars } from "./currency";
import { formatDateDisplay } from "./dates";
import type { ExpenseCategory } from "@/types/expense";
import type { SerializedExpense } from "@/lib/firestore/expenses";

interface ReportDetails {
  employeeName: string;
  businessPurpose: string;
  startDate: string;
  endDate: string;
}

/** Category display order for receipt sections in the PDF. */
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

// Header colors
const BLUE = { r: 0, g: 74, b: 132 };
const RED = { r: 180, g: 30, b: 30 };
const GRAY = { r: 100, g: 100, b: 100 };

/**
 * Render all pages of a PDF blob into PNG data-URL strings using pdfjs-dist.
 * The worker is served from public/pdf.worker.min.mjs (copied from node_modules).
 */
async function renderPdfPages(pdfBlob: Blob): Promise<string[]> {
  try {
    // Load pdf.js directly from public/ as a native ESM module,
    // bypassing webpack bundling which breaks pdfjs-dist's ESM exports.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib: any = await import(/* webpackIgnore: true */ "/pdf.min.mjs");

    // Use matching worker file from public/
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    const dataUrls: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const scale = 1.2; // Balance between quality and file size
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const canvasContext = canvas.getContext("2d");
      if (!canvasContext) {
        console.error("[ReceiptPDF] Could not get 2d context for page", pageNum);
        continue;
      }
      // White background (PDFs may have transparent backgrounds)
      canvasContext.fillStyle = "#ffffff";
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext, viewport }).promise;
      dataUrls.push(canvas.toDataURL("image/jpeg", 0.75));

      page.cleanup();
    }

    pdfDoc.destroy();
    return dataUrls;
  } catch (err) {
    console.error("[ReceiptPDF] Failed to render PDF pages:", err);
    return [];
  }
}

/**
 * Load an image via an <img> element and convert to a PNG data URL using canvas.
 * This works as a fallback when fetch-based approaches fail, because <img>
 * elements handle cross-origin loading differently when the server sends
 * appropriate CORS headers (Firebase Storage does for download URLs with tokens).
 */
function loadImageViaElement(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas 2d context"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Image element failed to load"));
    img.src = url;
  });
}

/**
 * Fetch a receipt from its Firebase Storage URL and return one or more
 * data-URL strings (one per page for PDFs, one for images).
 *
 * Tries three approaches in order:
 *   1. Server-side proxy (avoids CORS entirely)
 *   2. Direct fetch (works if CORS configured)
 *   3. <img> element fallback (handles cross-origin via CORS headers)
 */
async function fetchReceiptImages(url: string): Promise<string[]> {
  const fetchUrls = [
    `/api/receipts/image?url=${encodeURIComponent(url)}`,
    url,
  ];

  for (const fetchUrl of fetchUrls) {
    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        console.warn(`[ReceiptPDF] Fetch returned ${response.status} for: ${fetchUrl.substring(0, 80)}`);
        continue;
      }

      const blob = await response.blob();
      const type = blob.type;

      // PDF receipts → render each page as an image
      if (type === "application/pdf") {
        const pages = await renderPdfPages(blob);
        if (pages.length > 0) return pages;
        console.warn("[ReceiptPDF] PDF rendering returned 0 pages, trying next method");
        continue;
      }

      // Only handle image types
      if (!type.startsWith("image/")) {
        console.warn(`[ReceiptPDF] Unexpected content-type "${type}" for: ${fetchUrl.substring(0, 80)}`);
        continue;
      }

      // Render all images through canvas via createImageBitmap to apply
      // EXIF orientation metadata. Without this, portrait photos taken on
      // phones appear rotated sideways in the PDF because jsPDF does not
      // interpret EXIF orientation tags.
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      return [canvas.toDataURL("image/jpeg", 0.75)];
    } catch (err) {
      console.warn(`[ReceiptPDF] Fetch failed for ${fetchUrl.substring(0, 80)}:`, err);
    }
  }

  // Fallback: try loading via <img> element (handles CORS differently from fetch)
  try {
    console.info("[ReceiptPDF] Trying <img> element fallback for:", url.substring(0, 80));
    const dataUrl = await loadImageViaElement(url);
    return [dataUrl];
  } catch (err) {
    console.error("[ReceiptPDF] All methods failed to load receipt:", url.substring(0, 80), err);
  }

  return [];
}

/**
 * Load an HTMLImageElement from a data URL to read its natural dimensions.
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * Format amount in cents to a dollar string like "$525.59".
 */
function formatAmount(cents: number): string {
  const dollars = toDollars(cents);
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Helper: scale a data-URL image to fit within maxW × maxH and add it
 * to the jsPDF document at the given y position (centred horizontally).
 * Returns the height consumed.
 */
async function addImageToPdf(
  pdf: jsPDF,
  dataUrl: string,
  y: number,
  contentWidth: number,
  margin: number,
  maxW: number,
  maxH: number,
): Promise<number> {
  const img = await loadImage(dataUrl);
  const imgAspect = img.naturalWidth / img.naturalHeight;

  let drawWidth = Math.min(maxW, contentWidth);
  let drawHeight = drawWidth / imgAspect;

  if (drawHeight > maxH) {
    drawHeight = maxH;
    drawWidth = drawHeight * imgAspect;
  }

  const imgX = margin + (contentWidth - drawWidth) / 2;
  pdf.addImage(dataUrl, imgX, y, drawWidth, drawHeight);

  return drawHeight;
}

/**
 * Generate a Receipt Documentation PDF containing all receipt images,
 * organised by category with "Supporting Documentation" items first.
 *
 * Layout (matching the Wexford format):
 *   1. Support documents — full-page images (spreadsheet screenshots etc.)
 *   2. "Receipt Documentation" title page with employee/purpose/date-range
 *   3. Categorised receipt sections, each with header, entry line, image, and note
 */
export async function exportReceiptsPdf(
  expenses: SerializedExpense[],
  reportDetails: ReportDetails,
): Promise<Blob> {
  // Diagnostic: log all expenses and their receipt URLs
  console.log("[ReceiptPDF] Starting export for", expenses.length, "expenses");
  for (const exp of expenses) {
    console.log(`[ReceiptPDF]  - ${exp.category} | ${exp.vendor} | receiptUrl: ${exp.receiptUrl ? exp.receiptUrl.substring(0, 80) + "..." : "NULL"}`);
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  const maxImgH = pageHeight - margin * 2 - 80;

  let y = margin;
  let isFirstPage = true;

  function newPage() {
    if (!isFirstPage) pdf.addPage();
    isFirstPage = false;
    y = margin;
  }

  function ensureSpace(needed: number) {
    if (y + needed > pageHeight - margin) {
      newPage();
    }
  }

  // ---------------------------------------------------------------
  // 1. Support Documents — full-page images (no header/amount info)
  // ---------------------------------------------------------------
  const supportDocs = expenses.filter(
    (e) => e.category === "Supporting Documentation" && e.receiptUrl,
  );

  for (const doc of supportDocs) {
    const images = await fetchReceiptImages(doc.receiptUrl!);
    for (const dataUrl of images) {
      newPage();
      const fullPageMax = pageHeight - margin * 2;
      await addImageToPdf(pdf, dataUrl, margin, contentWidth, margin, contentWidth, fullPageMax);
    }
  }

  // ---------------------------------------------------------------
  // 2. "Receipt Documentation" title page
  // ---------------------------------------------------------------
  newPage();

  // Title — dark blue
  pdf.setFontSize(26);
  pdf.setTextColor(BLUE.r, BLUE.g, BLUE.b);
  pdf.text("Receipt Documentation", margin, y);
  y += 32;

  // Metadata — gray
  pdf.setFontSize(11);
  pdf.setTextColor(GRAY.r, GRAY.g, GRAY.b);

  if (reportDetails.employeeName) {
    pdf.text(`Employee: ${reportDetails.employeeName}`, margin, y);
    y += 18;
  }
  if (reportDetails.businessPurpose) {
    pdf.text(`Purpose: ${reportDetails.businessPurpose}`, margin, y);
    y += 18;
  }
  if (reportDetails.startDate && reportDetails.endDate) {
    pdf.text(
      `Date Range: ${formatDateDisplay(reportDetails.startDate)} to ${formatDateDisplay(reportDetails.endDate)}`,
      margin,
      y,
    );
    y += 18;
  }

  // Thick separator line
  y += 15;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(2);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 40;

  // ---------------------------------------------------------------
  // 3. Receipt sections grouped by category
  // ---------------------------------------------------------------
  const receiptExpenses = expenses.filter(
    (e) => e.category !== "Supporting Documentation",
  );

  // Group by category
  const byCategory = new Map<ExpenseCategory, SerializedExpense[]>();
  for (const exp of receiptExpenses) {
    const cat = exp.category as ExpenseCategory;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(exp);
  }

  // Sort each group by date ascending
  for (const [, items] of byCategory) {
    items.sort((a, b) => a.date.localeCompare(b.date));
  }

  for (const category of RECEIPT_CATEGORY_ORDER) {
    const items = byCategory.get(category);
    if (!items || items.length === 0) continue;

    // Category section header — red
    ensureSpace(50);
    pdf.setFontSize(20);
    pdf.setTextColor(RED.r, RED.g, RED.b);
    pdf.text(category, margin, y);
    y += 30;

    for (const expense of items) {
      // Entry line: MM/DD/YYYY | VENDOR | $amount
      ensureSpace(30);
      pdf.setFontSize(12);
      pdf.setTextColor(50, 50, 50);
      pdf.setFont("helvetica", "bold");
      const entryLine = `${formatDateDisplay(expense.date)} | ${expense.vendor.toUpperCase()} | ${formatAmount(expense.amount)}`;
      pdf.text(entryLine, margin, y);
      pdf.setFont("helvetica", "normal");
      y += 24;

      // Fetch and embed receipt image(s) — handles both images and PDFs
      if (expense.receiptUrl) {
        console.log(`[ReceiptPDF] Fetching receipt for ${expense.vendor}...`);
        const images = await fetchReceiptImages(expense.receiptUrl);
        console.log(`[ReceiptPDF] Got ${images.length} image(s) for ${expense.vendor}`);

        for (const dataUrl of images) {
          const img = await loadImage(dataUrl);
          const imgAspect = img.naturalWidth / img.naturalHeight;

          // Calculate available space on the current page
          const spaceLeft = pageHeight - margin - y - 30; // 30pt buffer for note/separator
          const availH = Math.max(spaceLeft, 200); // at least 200pt

          // Size image to fit available space, capped at content width
          let drawWidth = Math.min(contentWidth, 480);
          let drawHeight = drawWidth / imgAspect;

          // If it won't fit on the current page, shrink to fit
          if (drawHeight > availH && spaceLeft > 200) {
            drawHeight = availH;
            drawWidth = drawHeight * imgAspect;
          }

          // If still too tall for any page, cap at max page height
          if (drawHeight > maxImgH) {
            drawHeight = maxImgH;
            drawWidth = drawHeight * imgAspect;
          }

          // Only start a new page if truly no room (less than 200pt)
          if (spaceLeft < 200) {
            newPage();
          }

          const imgX = margin + (contentWidth - drawWidth) / 2;
          pdf.addImage(dataUrl, "JPEG", imgX, y, drawWidth, drawHeight);
          y += drawHeight + 10;
        }
      }

      if (!expense.receiptUrl) {
        console.warn(`[ReceiptPDF] No receiptUrl for expense: ${expense.vendor} (${expense.date})`);
      }

      // Note / description
      if (expense.description) {
        ensureSpace(20);
        pdf.setFontSize(9);
        pdf.setTextColor(130, 130, 130);
        pdf.text(`Note: ${expense.description}`, margin, y);
        y += 18;
      }

      // Light separator between receipts
      ensureSpace(15);
      pdf.setDrawColor(210, 210, 210);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 30;
    }
  }

  return pdf.output("blob");
}
