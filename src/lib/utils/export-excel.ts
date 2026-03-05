import ExcelJS from "exceljs";
import { toDollars } from "./currency";
import { EXCEL_COLUMN_MAP, isBizMeal } from "./categories";
import type { ExpenseCategory } from "@/types/expense";
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

/**
 * Convert YYYY-MM-DD to M/D/YYYY for Excel display.
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

/**
 * Reads the user's blank Wexford expense template, fills in expense data,
 * and returns a Blob of the populated workbook for download.
 */
export async function fillExpenseTemplate(
  templateFile: File,
  expenses: SerializedExpense[],
  reportDetails: ReportDetails
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await templateFile.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet("Expense");
  if (!sheet) throw new Error("Could not find 'Expense' sheet in template");

  // --- Fill header info ---
  // Name (row 3, col D)
  if (reportDetails.employeeName) {
    sheet.getRow(3).getCell(4).value = reportDetails.employeeName;
  }
  // Title (row 4, col D)
  if (reportDetails.title) {
    sheet.getRow(4).getCell(4).value = reportDetails.title;
  }
  // Department/Location (row 5, col D)
  if (reportDetails.deptLocation) {
    sheet.getRow(5).getCell(4).value = reportDetails.deptLocation;
  }
  // Business Purpose (row 9, col B)
  if (reportDetails.businessPurpose) {
    sheet.getRow(9).getCell(2).value = reportDetails.businessPurpose;
  }
  // Facility/Agency Visited (row 8, col N) — same as Points of Travel
  if (reportDetails.pointsOfTravel) {
    sheet.getRow(8).getCell(14).value = reportDetails.pointsOfTravel;
  }
  // Beginning Date (row 4, col N) — formatted M/D/YYYY
  if (reportDetails.startDate) {
    sheet.getRow(4).getCell(14).value = formatDate(reportDetails.startDate);
  }
  // Ending Date (row 5, col N) — formatted M/D/YYYY
  if (reportDetails.endDate) {
    sheet.getRow(5).getCell(14).value = formatDate(reportDetails.endDate);
  }

  // --- Split expenses and sort by date ascending (oldest first) ---
  const nonMealTravel = expenses
    .filter((e) => !isBizMeal(e.category as ExpenseCategory) && e.category !== "Personal Meals")
    .sort((a, b) => a.date.localeCompare(b.date));
  const personalMeals = expenses
    .filter((e) => e.category === "Personal Meals")
    .sort((a, b) => a.date.localeCompare(b.date));
  const mealExpenses = expenses
    .filter((e) => isBizMeal(e.category as ExpenseCategory))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Group all travel expenses by date — one row per date, amounts spread across category columns
  type ColAmounts = Map<number | "other", { amount: number; description: string }>;
  const travelByDate = new Map<string, ColAmounts>();

  for (const expense of [...nonMealTravel, ...personalMeals]) {
    if (!travelByDate.has(expense.date)) {
      travelByDate.set(expense.date, new Map());
    }
    const colMap = travelByDate.get(expense.date)!;
    const categoryCol = EXCEL_COLUMN_MAP[expense.category as ExpenseCategory];
    const key: number | "other" = categoryCol ?? "other";
    const existing = colMap.get(key) ?? { amount: 0, description: "" };
    colMap.set(key, {
      amount: existing.amount + expense.amount,
      description: existing.description || expense.description || expense.category,
    });
  }

  const sortedTravelDates = Array.from(travelByDate.keys()).sort();

  // --- Fill travel expenses (rows 15-25, max 11 rows) ---
  const TRAVEL_START_ROW = 15;
  const TRAVEL_MAX_ROWS = 11;

  sortedTravelDates.slice(0, TRAVEL_MAX_ROWS).forEach((date, i) => {
    const row = sheet.getRow(TRAVEL_START_ROW + i);
    const colMap = travelByDate.get(date)!;

    // Col B (2): Date — formatted M/D/YYYY
    row.getCell(2).value = formatDate(date);
    // Col C (3): Purpose for Expenses
    row.getCell(3).value = reportDetails.businessPurpose || "";
    // Col D (4): Points of Travel
    row.getCell(4).value = reportDetails.pointsOfTravel || "";

    for (const [key, { amount, description }] of colMap.entries()) {
      if (key === "other") {
        // "Other Allowable Expenses" → Col M (13) description, Col N (14) amount
        row.getCell(13).value = description;
        row.getCell(14).value = toDollars(amount);
      } else {
        row.getCell(key).value = toDollars(amount);
      }
    }
  });

  // --- Fill business meals (rows 31-35, max 5 rows) ---
  const MEAL_START_ROW = 31;
  const MEAL_MAX_ROWS = 5;

  mealExpenses.slice(0, MEAL_MAX_ROWS).forEach((expense, i) => {
    const row = sheet.getRow(MEAL_START_ROW + i);
    const amount = toDollars(expense.amount);

    // Col B (2): Date — formatted M/D/YYYY
    row.getCell(2).value = formatDate(expense.date);
    // Col C-D (3): Restaurant / Type of Entertainment
    row.getCell(3).value = expense.vendor;
    // Col E (5): Attendees / Persons Present
    row.getCell(5).value = expense.attendees || "";
    // Col O (15): Total amount
    row.getCell(15).value = amount;
  });

  // --- Fix Grand Total formula to handle empty strings ---
  // O36 returns "" when no business meals, which breaks O36+O26 in the Grand Total.
  // Replace O36 with a formula that returns 0 instead of "" when empty.
  const bizMealTotalCell = sheet.getRow(36).getCell(15);
  bizMealTotalCell.value = {
    formula: "SUM(O31:O35)",
  } as ExcelJS.CellFormulaValue;

  // --- Generate output ---
  const outputBuffer = await workbook.xlsx.writeBuffer();
  return new Blob([outputBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
