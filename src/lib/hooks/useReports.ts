"use client";

import { useState, useEffect, useCallback } from "react";
import type { SerializedReport } from "@/types/report";

export function useReports() {
  const [reports, setReports] = useState<SerializedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to fetch reports");

      const data = await res.json();
      setReports(data.reports);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch reports"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const deleteReport = async (id: string): Promise<void> => {
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete report");
    }

    await fetchReports();
  };

  const toggleReimbursed = async (
    id: string,
    reimbursed: boolean
  ): Promise<void> => {
    // Optimistic update
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              reimbursed,
              reimbursedAt: reimbursed ? new Date().toISOString() : null,
            }
          : r
      )
    );

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimbursed }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update reimbursement status");
      }
    } catch (err) {
      // Revert on failure
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                reimbursed: !reimbursed,
                reimbursedAt: !reimbursed ? new Date().toISOString() : null,
              }
            : r
        )
      );
      throw err;
    }
  };

  return {
    reports,
    loading,
    error,
    deleteReport,
    toggleReimbursed,
    refetch: fetchReports,
  };
}
