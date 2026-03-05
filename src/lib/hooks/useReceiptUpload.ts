"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useReceiptUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadReceipt = async (file: File): Promise<string | null> => {
    if (!user) {
      setError("Must be signed in to upload");
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      const storage = getFirebaseStorage();
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `receipts/${user.uid}/${timestamp}_${safeName}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload receipt";
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, uploadReceipt };
}
