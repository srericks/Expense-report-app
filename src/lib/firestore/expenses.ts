import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { getExpenseType } from "@/lib/utils/categories";
import { toCents } from "@/lib/utils/currency";
import type { ExpenseCategory, ExpenseStatus } from "@/types/expense";

const EXPENSES_COLLECTION = "expenses";

export interface ExpenseFilters {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  startDate?: string;
  endDate?: string;
}

export interface SerializedExpense {
  id: string;
  userId: string;
  date: string;
  vendor: string;
  amount: number;
  category: ExpenseCategory;
  expenseType: string;
  description: string | null;
  attendees: string | null;
  receiptUrl: string | null;
  reportId: string | null;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
}

function serializeExpense(id: string, data: FirebaseFirestore.DocumentData): SerializedExpense {
  return {
    id,
    userId: data.userId,
    date: data.date,
    vendor: data.vendor,
    amount: data.amount,
    category: data.category,
    expenseType: data.expenseType,
    description: data.description || null,
    attendees: data.attendees || null,
    receiptUrl: data.receiptUrl || null,
    reportId: data.reportId || null,
    status: data.status,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
  };
}

export async function createExpense(
  userId: string,
  data: {
    date: string;
    vendor: string;
    amount: number;
    category: ExpenseCategory;
    description?: string;
    attendees?: string;
  },
  receiptUrl?: string
): Promise<string> {
  const docRef = adminDb.collection(EXPENSES_COLLECTION).doc();

  await docRef.set({
    userId,
    date: data.date,
    vendor: data.vendor,
    amount: toCents(data.amount),
    category: data.category,
    expenseType: getExpenseType(data.category),
    description: data.description || null,
    attendees: data.attendees || null,
    receiptUrl: receiptUrl || null,
    reportId: null,
    status: "draft",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
}

export async function getExpenses(
  userId: string,
  filters?: ExpenseFilters
): Promise<SerializedExpense[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(EXPENSES_COLLECTION)
    .where("userId", "==", userId);

  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }
  if (filters?.category) {
    query = query.where("category", "==", filters.category);
  }
  if (filters?.startDate) {
    query = query.where("date", ">=", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.where("date", "<=", filters.endDate);
  }

  query = query.orderBy("date", "desc");

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => serializeExpense(doc.id, doc.data()));
}

export async function getExpenseById(
  userId: string,
  expenseId: string
): Promise<SerializedExpense | null> {
  const doc = await adminDb.collection(EXPENSES_COLLECTION).doc(expenseId).get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.userId !== userId) return null;

  return serializeExpense(doc.id, data);
}

export async function updateExpense(
  userId: string,
  expenseId: string,
  data: {
    date?: string;
    vendor?: string;
    amount?: number;
    category?: ExpenseCategory;
    description?: string;
    attendees?: string;
    receiptUrl?: string;
  }
): Promise<void> {
  const docRef = adminDb.collection(EXPENSES_COLLECTION).doc(expenseId);
  const doc = await docRef.get();

  if (!doc.exists || doc.data()?.userId !== userId) {
    throw new Error("Expense not found");
  }

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.date !== undefined) updateData.date = data.date;
  if (data.vendor !== undefined) updateData.vendor = data.vendor;
  if (data.amount !== undefined) updateData.amount = toCents(data.amount);
  if (data.category !== undefined) {
    updateData.category = data.category;
    updateData.expenseType = getExpenseType(data.category);
  }
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.attendees !== undefined) updateData.attendees = data.attendees || null;
  if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl || null;

  await docRef.update(updateData);
}

export async function deleteExpense(
  userId: string,
  expenseId: string
): Promise<void> {
  const docRef = adminDb.collection(EXPENSES_COLLECTION).doc(expenseId);
  const doc = await docRef.get();

  if (!doc.exists || doc.data()?.userId !== userId) {
    throw new Error("Expense not found");
  }

  await docRef.delete();
}
