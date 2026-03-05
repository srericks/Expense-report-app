import { Timestamp } from "firebase/firestore";

export interface OrgBranding {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  companyName: string;
  reportTitle: string;
  headerBgColor: string;
}

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type PlanId = "starter" | "pro" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  branding: OrgBranding;
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus: SubscriptionStatus;
  planId: PlanId;
  maxMembers: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type MemberRole = "owner" | "admin" | "member";

export interface OrgMember {
  userId: string;
  email: string;
  displayName: string;
  role: MemberRole;
  joinedAt: Timestamp;
  invitedBy?: string;
}

export const DEFAULT_BRANDING: OrgBranding = {
  logoUrl: "",
  primaryColor: "#1e40af",
  secondaryColor: "#3b82f6",
  accentColor: "#f59e0b",
  companyName: "My Company",
  reportTitle: "Expense Report",
  headerBgColor: "#1e3a5f",
};
