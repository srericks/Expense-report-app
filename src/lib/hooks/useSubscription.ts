"use client";

import { useState, useEffect, useCallback } from "react";
import type { SubscriptionData } from "@/lib/firestore/subscriptions";
import type { SubscriptionPlan } from "@/types/subscription";
import { PLANS } from "@/types/subscription";

interface SubscriptionResponse extends SubscriptionData {
  reportsUsed: number;
  reportLimit: number; // -1 means unlimited
  trialExpired: boolean;
  trialDaysRemaining: number | null;
}

interface UseSubscriptionReturn {
  subscription: SubscriptionResponse | null;
  currentPlan: SubscriptionPlan | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCheckoutSession: (
    planId: "starter" | "pro" | "enterprise",
    interval?: "monthly" | "annual"
  ) => Promise<void>;
  createPortalSession: () => Promise<void>;
  checkoutLoading: boolean;
  portalLoading: boolean;
  stripeConfigured: boolean;
  reportsUsed: number;
  reportLimit: number;
  hasSubscription: boolean;
  trialDaysRemaining: number | null;
  isTrialExpired: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] =
    useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/subscription");
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch subscription"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const planId = subscription?.planId;
  const currentPlan: SubscriptionPlan | null =
    planId && planId !== "none" ? PLANS[planId] || null : null;

  const hasSubscription =
    subscription?.subscriptionStatus === "active" ||
    (subscription?.subscriptionStatus === "trialing" &&
      !subscription.trialExpired);

  const createCheckoutSession = useCallback(
    async (
      planId: "starter" | "pro" | "enterprise",
      interval: "monthly" | "annual" = "monthly"
    ) => {
      setCheckoutLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, interval }),
        });

        if (res.status === 503) {
          setStripeConfigured(false);
          setError(
            "Billing is not yet configured. Please contact support."
          );
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create checkout session");
        }

        const { url } = await res.json();
        if (url) {
          window.location.href = url;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start checkout"
        );
      } finally {
        setCheckoutLoading(false);
      }
    },
    []
  );

  const createPortalSession = useCallback(async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (res.status === 503) {
        setStripeConfigured(false);
        setError("Billing is not yet configured. Please contact support.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to open billing portal");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open billing portal"
      );
    } finally {
      setPortalLoading(false);
    }
  }, []);

  return {
    subscription,
    currentPlan,
    loading,
    error,
    refetch: fetchSubscription,
    createCheckoutSession,
    createPortalSession,
    checkoutLoading,
    portalLoading,
    stripeConfigured,
    reportsUsed: subscription?.reportsUsed || 0,
    reportLimit: subscription?.reportLimit || 0,
    hasSubscription,
    trialDaysRemaining: subscription?.trialDaysRemaining ?? null,
    isTrialExpired: subscription?.trialExpired ?? false,
  };
}
