import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import { createReport, getReports, countReportsInPeriod } from "@/lib/firestore/reports";
import { getSubscription, isTrialExpired } from "@/lib/firestore/subscriptions";
import { PLANS } from "@/types/subscription";

const createReportSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  title: z.string().optional().default(""),
  deptLocation: z.string().optional().default(""),
  businessPurpose: z.string().min(1, "Business purpose is required"),
  pointsOfTravel: z.string().optional().default(""),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  expenseCount: z.number().int().positive(),
  totalAmount: z.number().int().nonnegative(),
  excelFileUrl: z.string().url().nullable(),
  receiptPdfUrl: z.string().url().nullable(),
  expenseIds: z
    .array(z.string().min(1))
    .min(1, "At least one expense is required"),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await getReports(user.uid);
    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
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
    const result = createReportSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    // Check subscription and report limits
    const subscription = await getSubscription(user.uid);

    const trialExpired =
      subscription.subscriptionStatus === "trialing" &&
      subscription.trialStartedAt !== null &&
      isTrialExpired(subscription.trialStartedAt);

    const isActive =
      (subscription.subscriptionStatus === "active" ||
        subscription.subscriptionStatus === "trialing") &&
      !trialExpired;

    if (!isActive || subscription.planId === "none") {
      return NextResponse.json(
        trialExpired
          ? {
              error: "Your 7-day free trial has ended",
              code: "TRIAL_EXPIRED",
              message:
                "Your free trial has expired. Visit the Billing page to subscribe and continue creating reports.",
            }
          : {
              error: "Active subscription required",
              code: "NO_SUBSCRIPTION",
              message:
                "You need an active subscription to finalize reports. Visit the Billing page to subscribe.",
            },
        { status: 403 }
      );
    }

    const plan = PLANS[subscription.planId];
    if (plan && plan.maxReportsPerYear !== Infinity) {
      const periodStart =
        subscription.currentPeriodStart?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10);
      const startDate = new Date(periodStart);
      const yearEnd = new Date(startDate);
      yearEnd.setFullYear(yearEnd.getFullYear() + 1);
      const endDate = yearEnd.toISOString().slice(0, 10);

      const count = await countReportsInPeriod(user.uid, periodStart, endDate);
      if (count >= plan.maxReportsPerYear) {
        return NextResponse.json(
          {
            error: "Report limit reached",
            code: "LIMIT_REACHED",
            message: `You've used all ${plan.maxReportsPerYear} reports for your ${plan.name} plan. Upgrade your plan for more reports.`,
            reportsUsed: count,
            reportLimit: plan.maxReportsPerYear,
          },
          { status: 403 }
        );
      }
    }

    const reportId = await createReport(user.uid, result.data);
    return NextResponse.json({ id: reportId }, { status: 201 });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
