export interface SerializedReport {
  id: string;
  userId: string;
  employeeName: string;
  title: string;
  deptLocation: string;
  businessPurpose: string;
  pointsOfTravel: string;
  startDate: string;
  endDate: string;
  expenseCount: number;
  totalAmount: number; // in cents
  excelFileUrl: string | null;
  receiptPdfUrl: string | null;
  expenseIds: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  reimbursed: boolean;
  reimbursedAt: string | null; // ISO string, null if not yet reimbursed
}
