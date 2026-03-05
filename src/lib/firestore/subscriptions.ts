import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { PlanId, SubscriptionStatus } from "@/types/organization";

const COLLECTION = "subscriptions";

export const TRIAL_DURATION_DAYS = 7;

export interface SubscriptionData {
  planId: PlanId | "none";
  subscriptionStatus: SubscriptionStatus | "none";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialStartedAt: string | null;
}

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  planId: "none",
  subscriptionStatus: "none",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripePriceId: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialStartedAt: null,
};

export function isTrialExpired(trialStartedAt: string): boolean {
  const expiry =
    new Date(trialStartedAt).getTime() +
    TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() > expiry;
}

export function getTrialDaysRemaining(trialStartedAt: string): number {
  const expiry =
    new Date(trialStartedAt).getTime() +
    TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)));
}

export async function getSubscription(
  userId: string
): Promise<SubscriptionData> {
  const doc = await adminDb.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return DEFAULT_SUBSCRIPTION;

  const data = doc.data()!;
  return {
    planId: data.planId || "free",
    subscriptionStatus: data.subscriptionStatus || "none",
    stripeCustomerId: data.stripeCustomerId || null,
    stripeSubscriptionId: data.stripeSubscriptionId || null,
    stripePriceId: data.stripePriceId || null,
    currentPeriodStart: data.currentPeriodStart || null,
    currentPeriodEnd: data.currentPeriodEnd || null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
    trialStartedAt: data.trialStartedAt || null,
  };
}

export async function updateSubscription(
  userId: string,
  updates: Partial<SubscriptionData>
): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(userId)
    .set({ ...updates, updatedAt: Timestamp.now() }, { merge: true });
}

/**
 * Initializes a 7-day free trial for a brand-new user.
 * No-ops if the user already has a subscription record.
 */
export async function initTrialForNewUser(userId: string): Promise<void> {
  const doc = await adminDb.collection(COLLECTION).doc(userId).get();
  if (doc.exists) return;

  const now = new Date().toISOString();
  await adminDb
    .collection(COLLECTION)
    .doc(userId)
    .set({
      planId: "pro",
      subscriptionStatus: "trialing",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: now.slice(0, 10),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialStartedAt: now,
      createdAt: Timestamp.now(),
    });
}

export async function getUserIdByStripeCustomerId(
  stripeCustomerId: string
): Promise<string | null> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].id;
}
