import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import {
  getSubscription,
  isTrialExpired,
  getTrialDaysRemaining,
} from "@/lib/firestore/subscriptions";
import { countReportsInPeriod } from "@/lib/firestore/reports";
import { PLANS } from "@/types/subscription";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await getSubscription(user.uid);

    let reportsUsed = 0;
    let reportLimit = 0;

    const plan =
      subscription.planId !== "none" ? PLANS[subscription.planId] : null;

    if (plan) {
      reportLimit = plan.maxReportsPerYear;

      if (reportLimit !== Infinity) {
        const periodStart =
          subscription.currentPeriodStart?.slice(0, 10) ||
          new Date().toISOString().slice(0, 10);
        const startDate = new Date(periodStart);
        const yearEnd = new Date(startDate);
        yearEnd.setFullYear(yearEnd.getFullYear() + 1);
        const endDate = yearEnd.toISOString().slice(0, 10);

        reportsUsed = await countReportsInPeriod(
          user.uid,
          periodStart,
          endDate
        );
      }
    }

    const isTrialing = subscription.subscriptionStatus === "trialing";
    const trialExpired =
      isTrialing && subscription.trialStartedAt
        ? isTrialExpired(subscription.trialStartedAt)
        : false;
    const trialDaysRemaining =
      isTrialing && subscription.trialStartedAt && !trialExpired
        ? getTrialDaysRemaining(subscription.trialStartedAt)
        : null;

    return NextResponse.json({
      ...subscription,
      reportsUsed,
      reportLimit: reportLimit === Infinity ? -1 : reportLimit,
      trialExpired,
      trialDaysRemaining,
    });
  } catch (error) {
    console.error("Failed to fetch subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
