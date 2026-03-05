"use client";

import { useState, useEffect, useCallback } from "react";
import type { SerializedExpense } from "@/lib/firestore/expenses";

interface UseExpensesOptions {
  status?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export function useExpenses(options?: UseExpensesOptions) {
  const [expenses, setExpenses] = useState<SerializedExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options?.status) params.set("status", options.status);
      if (options?.category) params.set("category", options.category);
      if (options?.startDate) params.set("startDate", options.startDate);
      if (options?.endDate) params.set("endDate", options.endDate);

      const query = params.toString();
      const url = `/api/expenses${query ? `?${query}` : ""}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch expenses");

      const data = await res.json();
      setExpenses(data.expenses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch expenses");
    } finally {
      setLoading(false);
    }
  }, [options?.status, options?.category, options?.startDate, options?.endDate]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const createExpense = async (data: {
    date: string;
    vendor: string;
    amount: number;
    category: string;
    description?: string;
    attendees?: string;
    receiptUrl?: string;
  }) => {
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create expense");
    }

    const result = await res.json();
    await fetchExpenses();
    return result.id as string;
  };

  const updateExpense = async (
    id: string,
    data: {
      date?: string;
      vendor?: string;
      amount?: number;
      category?: string;
      description?: string;
      attendees?: string;
      receiptUrl?: string;
    }
  ) => {
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update expense");
    }

    await fetchExpenses();
  };

  const deleteExpense = async (id: string) => {
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete expense");
    }

    await fetchExpenses();
  };

  return {
    expenses,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
}
