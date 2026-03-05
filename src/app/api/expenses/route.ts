import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import { createExpense, getExpenses } from "@/lib/firestore/expenses";
import { getSubscription } from "@/lib/firestore/subscriptions";
import { EXPENSE_CATEGORIES } from "@/types/expense";
import type { ExpenseCategory, ExpenseStatus } from "@/types/expense";

const createExpenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  vendor: z.string().min(1, "Vendor is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().max(500).optional(),
  attendees: z.string().max(500).optional(),
  receiptUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const filters: {
    status?: ExpenseStatus;
    category?: ExpenseCategory;
    startDate?: string;
    endDate?: string;
  } = {};

  const status = searchParams.get("status");
  if (status) filters.status = status as ExpenseStatus;

  const category = searchParams.get("category");
  if (category) filters.category = category as ExpenseCategory;

  const startDate = searchParams.get("startDate");
  if (startDate) filters.startDate = startDate;

  const endDate = searchParams.get("endDate");
  if (endDate) filters.endDate = endDate;

  try {
    const expenses = await getExpenses(user.uid, filters);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = createExpenseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    // Check that user has an active subscription (but don't enforce limits here —
    // limits are enforced at report finalization time, not per-receipt)
    const subscription = await getSubscription(user.uid);
    const isActive =
      subscription.subscriptionStatus === "active" ||
      subscription.subscriptionStatus === "trialing";

    if (!isActive || subscription.planId === "none") {
      return NextResponse.json(
        {
          error: "Active subscription required",
          code: "NO_SUBSCRIPTION",
          message:
            "You need an active subscription to create expenses. Visit the Billing page to subscribe.",
        },
        { status: 403 }
      );
    }

    const { receiptUrl, ...expenseData } = result.data;
    const expenseId = await createExpense(user.uid, expenseData, receiptUrl);

    return NextResponse.json({ id: expenseId }, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
