export interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number; // monthly price in cents
  annualPrice: number; // annual price in cents (with 15% discount)
  maxReportsPerYear: number;
  features: string[];
}

export const PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceId: "", // Set from env at runtime
    price: 1000,
    annualPrice: 10200,
    maxReportsPerYear: 12,
    features: [
      "12 reports per year",
      "AI receipt scanning",
      "Excel & PDF export",
      "Receipt image storage",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceId: "", // Set from env at runtime
    price: 1500,
    annualPrice: 15300,
    maxReportsPerYear: 30,
    features: [
      "30 reports per year",
      "AI receipt scanning",
      "Excel & PDF export",
      "Receipt image storage",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceId: "", // Set from env at runtime
    price: 2000,
    annualPrice: 20400,
    maxReportsPerYear: Infinity,
    features: [
      "Unlimited reports",
      "AI receipt scanning",
      "Excel & PDF export",
      "Receipt image storage",
    ],
  },
};
