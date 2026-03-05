import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import { initTrialForNewUser } from "@/lib/firestore/subscriptions";

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initTrialForNewUser(user.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to initialize trial:", error);
    return NextResponse.json(
      { error: "Failed to initialize trial" },
      { status: 500 }
    );
  }
}
