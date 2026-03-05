import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

// Lazy singletons - only initialize when actually accessed in the browser
let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

export function getFirebaseAuth(): Auth {
  if (!_app) _app = getFirebaseApp();
  if (!_auth) _auth = getAuth(_app);
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_app) _app = getFirebaseApp();
  if (!_db) _db = getFirestore(_app);
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_app) _app = getFirebaseApp();
  if (!_storage) _storage = getStorage(_app);
  return _storage;
}

// Convenience getters (backwards compatible)
export const auth = typeof window !== "undefined" ? getFirebaseAuth() : (undefined as unknown as Auth);
export const db = typeof window !== "undefined" ? getFirebaseDb() : (undefined as unknown as Firestore);
export const storage = typeof window !== "undefined" ? getFirebaseStorage() : (undefined as unknown as FirebaseStorage);
