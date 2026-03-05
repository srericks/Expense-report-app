import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import {
  getSubscription,
  updateSubscription,
} from "@/lib/firestore/subscriptions";

const checkoutSchema = z.object({
  planId: z.enum(["starter", "pro", "enterprise"]),
  interval: z.enum(["monthly", "annual"]).default("monthly"),
});

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Please contact support." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { planId, interval } = result.data;
    const stripe = getStripe();

    const priceIdMap: Record<string, Record<string, string | undefined>> = {
      starter: {
        monthly: process.env.STRIPE_STARTER_PRICE_ID,
        annual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
      },
      pro: {
        monthly: process.env.STRIPE_PRO_PRICE_ID,
        annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
      },
      enterprise: {
        monthly: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        annual: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
      },
    };
    const priceId = priceIdMap[planId]?.[interval];

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${planId} plan.` },
        { status: 503 }
      );
    }

    // Get or create Stripe customer
    const subscription = await getSubscription(user.uid);
    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { firebaseUid: user.uid },
      });
      customerId = customer.id;
      await updateSubscription(user.uid, { stripeCustomerId: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      metadata: {
        firebaseUid: user.uid,
        planId,
        interval,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
