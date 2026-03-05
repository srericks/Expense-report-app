import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  defaultOrgId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
