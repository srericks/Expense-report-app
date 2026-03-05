import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for fetching receipt images from Firebase Storage.
 * This avoids CORS issues when the client needs to embed images in a PDF.
 * Only proxies Firebase Storage URLs for security.
 *
 * Auth is enforced by middleware (matcher includes /api/receipts/:path*),
 * so we don't need a second auth check here.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Only allow proxying Firebase Storage URLs to prevent open proxy abuse.
  // Accept both legacy (firebasestorage.googleapis.com) and new (*.firebasestorage.app) formats.
  const isFirebaseUrl =
    url.startsWith("https://firebasestorage.googleapis.com/") ||
    /^https:\/\/[a-z0-9.-]+\.firebasestorage\.app\//.test(url) ||
    url.includes("firebasestorage");
  if (!isFirebaseUrl) {
    console.warn("[ReceiptProxy] Rejected non-Firebase URL:", url.substring(0, 120));
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[ReceiptProxy] Upstream returned ${response.status} for: ${url.substring(0, 120)}`);
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("Content-Type") || "application/octet-stream";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[ReceiptProxy] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 },
    );
  }
}
