import { EXPENSE_CATEGORIES, BIZ_MEAL_CATEGORY, type ExpenseCategory, type ExpenseType } from "@/types/expense";

export { EXPENSE_CATEGORIES, BIZ_MEAL_CATEGORY };

/**
 * Determine if a category is a business meal.
 */
export function isBizMeal(category: ExpenseCategory): boolean {
  return category === BIZ_MEAL_CATEGORY;
}

/**
 * Get expense type from category.
 */
export function getExpenseType(category: ExpenseCategory): ExpenseType {
  return isBizMeal(category) ? "business_meal" : "travel";
}

/**
 * Column mapping for Excel export.
 */
export const EXCEL_COLUMN_MAP: Partial<Record<ExpenseCategory, number>> = {
  "Mileage ($ Amount)": 5,
  "Car Rental": 6,
  "Rental Car Fuel": 7,
  "Tolls/Parking": 8,
  "Airfare": 9,
  "Taxi": 10,
  "Personal Meals": 11,
  "Hotel": 12,
};
