import ai from "./client";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/types/expense";

export interface ReceiptAnalysisResult {
  date: string;
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  confidence: number;
}

const CATEGORY_LIST = EXPENSE_CATEGORIES.join(", ");

const PROMPT = `You are an expert at reading receipts and invoices. Analyze this document carefully and extract the following information. Return a JSON object with these exact fields:

- "date": The transaction date in YYYY-MM-DD format. For rental agreements, use the pickup/start date. For hotel folios/receipts, use the checkout/departure date (this is when the credit card is actually charged, NOT the check-in/arrival date). If the year is unclear, assume 2026.
- "vendor": The company/merchant name (e.g. "Enterprise", "Hilton", "Delta Airlines", "Shell").
- "amount": The total amount charged as a decimal number in US dollars (e.g. 42.50). Look for "Total", "Total Charges", "Amount Due", "Amount Charged", or the final billed amount. Do NOT use $0.00 if there are clearly charges listed.
- "category": The best matching category from this list: ${CATEGORY_LIST}
- "description": A brief one-line description of the transaction.
- "confidence": A number from 0 to 1 indicating how confident you are in the extraction accuracy.

Category matching rules (you MUST pick one from the list above):
- Car rental companies (Enterprise, Hertz, Avis, Budget, National, Alamo, Dollar, Thrifty, Sixt): use "Car Rental"
- Gas/fuel station receipts for a rental car: use "Rental Car Fuel"
- Hotel/lodging/resort (Hilton, Marriott, Hampton Inn, Holiday Inn, etc.): use "Hotel"
- Airline/flights (Delta, United, American, Southwest, etc.): use "Airfare"
- Ride services (Uber, Lyft, taxi, cab): use "Taxi"
- Restaurant/dining/food delivery: use "Personal Meals" unless clearly a business meal with clients
- Parking garages, parking meters, toll charges, E-ZPass: use "Tolls/Parking"
- Mileage reimbursement or mileage logs: use "Mileage ($ Amount)"
- If unsure, use "Other Allowable Expenses"

Important:
- Read the ENTIRE document thoroughly, including fine print, totals sections, and summary areas.
- For car rental receipts, the total is often at the bottom under "Total" or "Total Charges". It may also show "Amount Charged" to a credit card. Use whichever represents the actual amount paid.
- For hotel folios/receipts: The "Balance" line often shows $0.00 because the guest already paid. Do NOT use the balance as the amount. Instead, sum up the actual charges (room charges, taxes, fees, food & beverage, tips, etc.) EXCLUDING credits/comps and credit card payment lines. Alternatively, look for the credit card payment amount (shown as a negative number or in parentheses like "($536.72)") and use its absolute value as the total. If there are multiple payment lines, sum their absolute values.
- For multi-page documents, look at ALL pages for the total amount.
- Always try your best to extract data. Only set confidence to 0 if the document is completely unreadable or blank.`;

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 5000;

export async function analyzeReceipt(
  images: { data: string; mimeType: string }[]
): Promise<ReceiptAnalysisResult> {
  const imageParts = images.map((img) => ({
    inlineData: {
      data: img.data,
      mimeType: img.mimeType,
    },
  }));

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [...imageParts, { text: PROMPT }],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text ?? "";
      console.log("[ReceiptAnalyze] Raw Gemini response text:", text);
      const raw = JSON.parse(text);
      const parsed = Array.isArray(raw) ? raw[0] : raw;
      console.log("[ReceiptAnalyze] Parsed result:", JSON.stringify(parsed));

      // Validate category is in our allowed list
      const validCategory = EXPENSE_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : "Other Allowable Expenses";

      return {
        date: parsed.date || "",
        vendor: parsed.vendor || "",
        amount: typeof parsed.amount === "number" ? parsed.amount : 0,
        category: validCategory as ExpenseCategory,
        description: parsed.description || "",
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0,
      };
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      const isRetryable = status === 429 || status === 500 || status === 503;

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[ReceiptAnalyze] Gemini returned ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      break;
    }
  }

  // All retries exhausted — throw so callers know analysis failed
  console.error("[ReceiptAnalyze] Receipt analysis failed after retries:", lastError);
  throw lastError;
}
