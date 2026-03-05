import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

const COLLECTION = "userSettings";

export interface UserSettings {
  logoUrl: string | null;
  title: string | null;
  deptLocation: string | null;
}

const DEFAULT_SETTINGS: UserSettings = {
  logoUrl: null,
  title: null,
  deptLocation: null,
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const doc = await adminDb.collection(COLLECTION).doc(userId).get();
  if (!doc.exists) return DEFAULT_SETTINGS;

  const data = doc.data()!;
  return {
    logoUrl: data.logoUrl || null,
    title: data.title || null,
    deptLocation: data.deptLocation || null,
  };
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<UserSettings>
): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(userId)
    .set(
      { ...updates, updatedAt: Timestamp.now() },
      { merge: true }
    );
}
