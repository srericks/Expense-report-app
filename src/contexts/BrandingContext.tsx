"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface BrandingContextType {
  logoUrl: string | null;
  title: string | null;
  deptLocation: string | null;
  loading: boolean;
  updateLogoUrl: (url: string | null) => Promise<void>;
  updateProfileSettings: (updates: { title?: string | null; deptLocation?: string | null }) => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  logoUrl: null,
  title: null,
  deptLocation: null,
  loading: true,
  updateLogoUrl: async () => {},
  updateProfileSettings: async () => {},
});

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [deptLocation, setDeptLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logoUrl || null);
        setTitle(data.title || null);
        setDeptLocation(data.deptLocation || null);
      }
    } catch (err) {
      console.error("Failed to fetch branding settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function updateLogoUrl(url: string | null) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: url }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update branding");
    }

    setLogoUrl(url);
  }

  async function updateProfileSettings(updates: { title?: string | null; deptLocation?: string | null }) {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update profile settings");
    }

    if ("title" in updates) setTitle(updates.title ?? null);
    if ("deptLocation" in updates) setDeptLocation(updates.deptLocation ?? null);
  }

  return (
    <BrandingContext.Provider value={{ logoUrl, title, deptLocation, loading, updateLogoUrl, updateProfileSettings }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
