import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { getSubscription } from "@/lib/firestore/subscriptions";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  try {
    const subscription = await getSubscription(user.uid);

    if (!subscription.stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "No billing account found. Please subscribe to a plan first.",
        },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create portal session:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
