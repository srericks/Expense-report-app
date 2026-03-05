import { NextRequest, NextResponse } from "next/server";

// These routes are intercepted by the next-firebase-auth-edge middleware.
// The middleware handles setting/clearing the session cookie.
// These handlers serve as fallbacks.

export async function POST(_request: NextRequest) {
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json({ status: "ok" });
}
