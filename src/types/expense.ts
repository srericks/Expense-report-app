import { Timestamp } from "firebase/firestore";

export const EXPENSE_CATEGORIES = [
  "Supporting Documentation",
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
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseType = "travel" | "business_meal";

export type ExpenseStatus = "draft" | "submitted" | "approved" | "rejected";

export interface Expense {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  vendor: string;
  amount: number; // stored in cents
  category: ExpenseCategory;
  expenseType: ExpenseType;
  description?: string;
  attendees?: string;
  receiptUrl?: string;
  receiptImages?: string[]; // base64 images (client-side only, not stored in Firestore)
  reportId?: string;
  status: ExpenseStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExpenseFormData {
  date: string;
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  attendees?: string;
}

export const BIZ_MEAL_CATEGORY: ExpenseCategory = "Business Meals/Entertainment";
