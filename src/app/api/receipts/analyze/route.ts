import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/firebase/auth-api";
import { analyzeReceipt } from "@/lib/gemini/analyze-receipt";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed` },
        { status: 400 }
      );
    }

    const images: { data: string; mimeType: string }[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, PDF` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      images.push({
        data: buffer.toString("base64"),
        mimeType: file.type,
      });
    }

    console.log(`[ReceiptAnalyze] Sending ${images.length} file(s) to Gemini. Types: ${images.map(i => i.mimeType).join(", ")}. Sizes: ${images.map(i => Math.round(i.data.length / 1024) + "KB base64").join(", ")}`);
    const result = await analyzeReceipt(images);
    console.log("[ReceiptAnalyze] Gemini result:", JSON.stringify(result));
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Receipt analysis error:", error);
    const status = (error as { status?: number }).status;
    if (status === 429 || status === 503) {
      return NextResponse.json(
        { error: "AI service is temporarily overloaded. Please try again in a few moments." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Failed to analyze receipt. Please try again or enter details manually." },
      { status: 500 }
    );
  }
}
