import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import { getUserSettings, updateUserSettings } from "@/lib/firestore/user-settings";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getUserSettings(user.uid);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Only allow updating known fields
    const updates: Record<string, unknown> = {};
    if ("logoUrl" in body) {
      if (body.logoUrl !== null && typeof body.logoUrl !== "string") {
        return NextResponse.json(
          { error: "logoUrl must be a string or null" },
          { status: 400 }
        );
      }
      updates.logoUrl = body.logoUrl;
    }
    if ("title" in body) {
      if (body.title !== null && typeof body.title !== "string") {
        return NextResponse.json(
          { error: "title must be a string or null" },
          { status: 400 }
        );
      }
      updates.title = body.title;
    }
    if ("deptLocation" in body) {
      if (body.deptLocation !== null && typeof body.deptLocation !== "string") {
        return NextResponse.json(
          { error: "deptLocation must be a string or null" },
          { status: 400 }
        );
      }
      updates.deptLocation = body.deptLocation;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    await updateUserSettings(user.uid, updates);
    const settings = await getUserSettings(user.uid);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
