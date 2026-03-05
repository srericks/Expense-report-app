import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { SerializedReport } from "@/types/report";

const REPORTS_COLLECTION = "reports";
const EXPENSES_COLLECTION = "expenses";

function serializeReport(
  id: string,
  data: FirebaseFirestore.DocumentData
): SerializedReport {
  return {
    id,
    userId: data.userId,
    employeeName: data.employeeName,
    title: data.title,
    deptLocation: data.deptLocation,
    businessPurpose: data.businessPurpose,
    pointsOfTravel: data.pointsOfTravel,
    startDate: data.startDate,
    endDate: data.endDate,
    expenseCount: data.expenseCount,
    totalAmount: data.totalAmount,
    excelFileUrl: data.excelFileUrl || null,
    receiptPdfUrl: data.receiptPdfUrl || null,
    expenseIds: data.expenseIds || [],
    createdAt:
      data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    updatedAt:
      data.updatedAt?.toDate?.().toISOString() ?? new Date().toISOString(),
    reimbursed: data.reimbursed ?? false,
    reimbursedAt: data.reimbursedAt?.toDate?.().toISOString() ?? null,
  };
}

export interface CreateReportData {
  employeeName: string;
  title: string;
  deptLocation: string;
  businessPurpose: string;
  pointsOfTravel: string;
  startDate: string;
  endDate: string;
  expenseCount: number;
  totalAmount: number;
  excelFileUrl: string | null;
  receiptPdfUrl: string | null;
  expenseIds: string[];
}

/**
 * Create a report and batch-update all linked expenses to set their reportId.
 * Uses a Firestore batched write for atomicity.
 */
export async function createReport(
  userId: string,
  data: CreateReportData
): Promise<string> {
  const batch = adminDb.batch();

  const reportRef = adminDb.collection(REPORTS_COLLECTION).doc();
  batch.set(reportRef, {
    userId,
    employeeName: data.employeeName,
    title: data.title,
    deptLocation: data.deptLocation,
    businessPurpose: data.businessPurpose,
    pointsOfTravel: data.pointsOfTravel,
    startDate: data.startDate,
    endDate: data.endDate,
    expenseCount: data.expenseCount,
    totalAmount: data.totalAmount,
    excelFileUrl: data.excelFileUrl,
    receiptPdfUrl: data.receiptPdfUrl,
    expenseIds: data.expenseIds,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  for (const expenseId of data.expenseIds) {
    const expenseRef = adminDb.collection(EXPENSES_COLLECTION).doc(expenseId);
    batch.update(expenseRef, {
      reportId: reportRef.id,
      updatedAt: Timestamp.now(),
    });
  }

  await batch.commit();
  return reportRef.id;
}

/**
 * Count reports created by a user within a date range (for subscription enforcement).
 */
export async function countReportsInPeriod(
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const start = Timestamp.fromDate(new Date(startDate));
  const end = Timestamp.fromDate(new Date(endDate));

  const snapshot = await adminDb
    .collection(REPORTS_COLLECTION)
    .where("userId", "==", userId)
    .where("createdAt", ">=", start)
    .where("createdAt", "<", end)
    .count()
    .get();

  return snapshot.data().count;
}

export async function getReports(userId: string): Promise<SerializedReport[]> {
  const snapshot = await adminDb
    .collection(REPORTS_COLLECTION)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => serializeReport(doc.id, doc.data()));
}

export async function getReportById(
  userId: string,
  reportId: string
): Promise<SerializedReport | null> {
  const doc = await adminDb
    .collection(REPORTS_COLLECTION)
    .doc(reportId)
    .get();

  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.userId !== userId) return null;

  return serializeReport(doc.id, data);
}

/**
 * Delete a report and unlink its expenses (set reportId back to null).
 */
export async function deleteReport(
  userId: string,
  reportId: string
): Promise<void> {
  const reportRef = adminDb.collection(REPORTS_COLLECTION).doc(reportId);
  const doc = await reportRef.get();

  if (!doc.exists || doc.data()?.userId !== userId) {
    throw new Error("Report not found");
  }

  const reportData = doc.data()!;
  const batch = adminDb.batch();

  for (const expenseId of reportData.expenseIds || []) {
    const expenseRef = adminDb.collection(EXPENSES_COLLECTION).doc(expenseId);
    const expenseDoc = await expenseRef.get();
    if (expenseDoc.exists) {
      batch.update(expenseRef, {
        reportId: null,
        updatedAt: Timestamp.now(),
      });
    }
  }

  batch.delete(reportRef);

  await batch.commit();
}

/**
 * Toggle the reimbursement status of a report.
 */
export async function toggleReportReimbursed(
  userId: string,
  reportId: string,
  reimbursed: boolean
): Promise<void> {
  const reportRef = adminDb.collection(REPORTS_COLLECTION).doc(reportId);
  const doc = await reportRef.get();

  if (!doc.exists || doc.data()?.userId !== userId) {
    throw new Error("Report not found");
  }

  await reportRef.update({
    reimbursed,
    reimbursedAt: reimbursed ? Timestamp.now() : null,
    updatedAt: Timestamp.now(),
  });
}
