"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Check,
  Crown,
  Building2,
  Rocket,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PLANS } from "@/types/subscription";
import { cn } from "@/lib/utils/cn";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

const planIcons: Record<string, typeof Rocket> = {
  starter: Rocket,
  pro: Crown,
  enterprise: Building2,
};

const PLAN_ORDER = ["starter", "pro", "enterprise"] as const;

function BillingContent() {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const isCanceled = searchParams.get("canceled") === "true";

  const {
    subscription,
    currentPlan,
    loading,
    error,
    refetch,
    createCheckoutSession,
    createPortalSession,
    checkoutLoading,
    portalLoading,
    stripeConfigured,
    reportsUsed,
    reportLimit,
    hasSubscription,
    trialDaysRemaining,
    isTrialExpired,
  } = useSubscription();

  const [showBanner, setShowBanner] = useState(true);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    if (isSuccess) {
      refetch();
    }
  }, [isSuccess, refetch]);

  const activePlanId = subscription?.planId || "none";
  const isPastDue = subscription?.subscriptionStatus === "past_due";
  const isUnlimited = reportLimit === -1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Success banner */}
      {isSuccess && showBanner && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Your subscription has been updated successfully!</span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-green-500 hover:text-green-700 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Canceled banner */}
      {isCanceled && showBanner && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>
              Checkout was canceled. No changes were made to your plan.
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-amber-500 hover:text-amber-700 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stripe not configured warning */}
      {!stripeConfigured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Billing is not yet configured. Subscriptions are temporarily
            unavailable. Contact your administrator to set up Stripe
            integration.
          </span>
        </div>
      )}

      {/* Trial active banner */}
      {subscription?.subscriptionStatus === "trialing" && !isTrialExpired && trialDaysRemaining !== null && (
        <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-blue-800">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              <strong>Free trial active —</strong>{" "}
              {trialDaysRemaining === 1
                ? "1 day remaining"
                : `${trialDaysRemaining} days remaining`}
              . Subscribe before your trial ends to keep access.
            </span>
          </div>
        </div>
      )}

      {/* Trial expired banner */}
      {isTrialExpired && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Your free trial has ended.</strong> Subscribe to a plan
              below to continue creating reports.
            </span>
          </div>
        </div>
      )}

      {/* Current plan status card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {hasSubscription ? "Current Plan" : "No Active Subscription"}
              </h3>
              <p className="text-sm text-gray-500">
                {hasSubscription && currentPlan ? (
                  <>
                    You are on the{" "}
                    <strong className="text-gray-700">
                      {currentPlan.name}
                    </strong>{" "}
                    plan
                  </>
                ) : (
                  "Subscribe to a plan to start creating reports"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge
              status={subscription?.subscriptionStatus || "none"}
              trialDaysRemaining={trialDaysRemaining}
            />
            {subscription?.stripeCustomerId && (
              <Button
                variant="outline"
                size="sm"
                onClick={createPortalSession}
                loading={portalLoading}
                disabled={!stripeConfigured}
              >
                Manage Billing
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Report usage bar */}
        {hasSubscription && currentPlan && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-600">Reports used this year</span>
              <span className="font-medium text-gray-800">
                {isUnlimited
                  ? `${reportsUsed} used (unlimited)`
                  : `${reportsUsed} of ${reportLimit}`}
              </span>
            </div>
            {!isUnlimited && (
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    reportLimit > 0 && reportsUsed / reportLimit >= 0.9
                      ? "bg-red-500"
                      : reportLimit > 0 &&
                          reportsUsed / reportLimit >= 0.7
                        ? "bg-amber-500"
                        : "bg-brand-primary"
                  )}
                  style={{
                    width: `${Math.min((reportsUsed / (reportLimit || 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Period info for active subscriptions */}
        {hasSubscription && subscription?.currentPeriodEnd && (
          <p className="text-xs text-gray-400 mt-3">
            {subscription.cancelAtPeriodEnd
              ? `Your subscription ends on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
              : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
          </p>
        )}

        {/* Past due warning */}
        {isPastDue && (
          <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Your payment is past due. Please update your payment method to
            keep your subscription active.
          </div>
        )}
      </div>

      {/* Billing interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={cn(
            "text-sm font-medium",
            billingInterval === "monthly" ? "text-gray-900" : "text-gray-400"
          )}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={billingInterval === "annual"}
          onClick={() =>
            setBillingInterval((prev) =>
              prev === "monthly" ? "annual" : "monthly"
            )
          }
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
            billingInterval === "annual" ? "bg-brand-primary" : "bg-gray-200"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform",
              billingInterval === "annual" ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
        <span
          className={cn(
            "text-sm font-medium",
            billingInterval === "annual" ? "text-gray-900" : "text-gray-400"
          )}
        >
          Annual
        </span>
        {billingInterval === "annual" && (
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Save 15%
          </span>
        )}
      </div>

      {/* Plan comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLAN_ORDER.map((planKey) => {
          const plan = PLANS[planKey];
          const Icon = planIcons[planKey];
          const isCurrent = activePlanId === planKey;

          // Determine plan ranking for upgrade/downgrade logic
          const planRank = PLAN_ORDER.indexOf(planKey);
          const currentRank =
            activePlanId !== "none"
              ? PLAN_ORDER.indexOf(
                  activePlanId as (typeof PLAN_ORDER)[number]
                )
              : -1;
          const isUpgrade = planRank > currentRank;
          const isDowngrade = currentRank > planRank && currentRank >= 0;

          return (
            <div
              key={planKey}
              className={cn(
                "bg-white rounded-xl border-2 p-6 flex flex-col relative",
                isCurrent
                  ? "border-brand-primary ring-2 ring-brand-primary/20"
                  : planKey === "pro"
                    ? "border-brand-primary/30"
                    : "border-gray-200"
              )}
            >
              {/* Most Popular badge for Pro */}
              {planKey === "pro" && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-primary text-white text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-5 h-5 text-brand-primary" />
                <h3 className="text-lg font-semibold text-gray-800">
                  {plan.name}
                </h3>
                {isCurrent && (
                  <span className="ml-auto text-xs font-medium bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  $
                  {billingInterval === "monthly"
                    ? (plan.price / 100).toFixed(2)
                    : (plan.annualPrice / 100).toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">
                  /{billingInterval === "monthly" ? "month" : "year"}
                </span>
                {billingInterval === "annual" && (
                  <p className="text-xs text-gray-400 mt-1">
                    ${(plan.annualPrice / 12 / 100).toFixed(2)}/month
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Action button */}
              {isCurrent ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full"
                >
                  Current Plan
                </Button>
              ) : activePlanId === "none" ? (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => createCheckoutSession(planKey, billingInterval)}
                  loading={checkoutLoading}
                  disabled={!stripeConfigured || checkoutLoading}
                >
                  Subscribe
                </Button>
              ) : isUpgrade ? (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => createCheckoutSession(planKey, billingInterval)}
                  loading={checkoutLoading}
                  disabled={!stripeConfigured || checkoutLoading}
                >
                  Upgrade to {plan.name}
                </Button>
              ) : isDowngrade ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={createPortalSession}
                  loading={portalLoading}
                  disabled={
                    !stripeConfigured || !subscription?.stripeCustomerId
                  }
                >
                  Switch to {plan.name}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  trialDaysRemaining,
}: {
  status: string;
  trialDaysRemaining?: number | null;
}) {
  const trialLabel =
    status === "trialing" && trialDaysRemaining !== null && trialDaysRemaining !== undefined
      ? `Trial — ${trialDaysRemaining}d left`
      : "Trial";

  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    trialing: {
      label: trialLabel,
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    past_due: {
      label: "Past Due",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    canceled: {
      label: "Canceled",
      className: "bg-gray-50 text-gray-600 border-gray-200",
    },
    unpaid: {
      label: "Unpaid",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    none: {
      label: "No Plan",
      className: "bg-gray-50 text-gray-600 border-gray-200",
    },
  };

  const { label, className } = config[status] || config.none;

  return (
    <span
      className={cn(
        "text-xs font-medium px-2.5 py-1 rounded-full border",
        className
      )}
    >
      {label}
    </span>
  );
}

export default function BillingPage() {
  return (
    <div>
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Billing</h2>
        <p className="text-sm text-gray-500">
          Manage your subscription and billing details
        </p>
      </header>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <BillingContent />
      </Suspense>
    </div>
  );
}
