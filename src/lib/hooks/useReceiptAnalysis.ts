"use client";

import { useState } from "react";
import type { ReceiptAnalysisResult } from "@/lib/gemini/analyze-receipt";

export function useReceiptAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ReceiptAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeReceipt = async (files: File[]) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));

      const res = await fetch("/api/receipts/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to analyze receipt");
      }

      const data = await res.json();
      console.log("[ReceiptAnalysis] API response:", JSON.stringify(data, null, 2));
      setResult(data.data);
      return data.data as ReceiptAnalysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze receipt";
      setError(message);
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return { analyzing, result, error, analyzeReceipt, clearResult };
}
