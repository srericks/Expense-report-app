/**
 * Format cents to a dollar display string.
 * e.g. 4250 => "$42.50"
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a dollar amount string/number to cents.
 * e.g. 42.50 => 4250, "42.50" => 4250
 */
export function toCents(dollars: number | string): number {
  const num = typeof dollars === "string" ? parseFloat(dollars) : dollars;
  return Math.round(num * 100);
}

/**
 * Convert cents to dollar number.
 * e.g. 4250 => 42.50
 */
export function toDollars(cents: number): number {
  return cents / 100;
}
