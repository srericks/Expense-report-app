"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { createSession } from "@/lib/firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        // Sync session cookie whenever auth state changes
        const idToken = await firebaseUser.getIdToken();
        try {
          await createSession(idToken);
        } catch (err) {
          console.error("Failed to sync session:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  async function refreshUser() {
    const currentUser = getFirebaseAuth().currentUser;
    if (currentUser) {
      await currentUser.reload();
      const idToken = await currentUser.getIdToken(true);
      try {
        await createSession(idToken);
      } catch (err) {
        console.error("Failed to sync session after profile update:", err);
      }
      forceUpdate((c) => c + 1);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
