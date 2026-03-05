"use client";

import { useState, useRef, type DragEvent } from "react";
import { CloudUpload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Spinner from "@/components/ui/Spinner";

interface ReceiptUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  analyzing?: boolean;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ReceiptUploadZone({
  onFilesSelected,
  analyzing = false,
  disabled = false,
  maxFiles = 5,
  className,
}: ReceiptUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ name: string; url: string; type: string }[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateFiles(files: File[]): File[] | null {
    setValidationError(null);

    if (files.length > maxFiles) {
      setValidationError(`Maximum ${maxFiles} files allowed`);
      return null;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setValidationError(`Invalid file type: ${file.name}. Use JPEG, PNG, WebP, or PDF.`);
        return null;
      }
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(`File "${file.name}" exceeds 10MB limit`);
        return null;
      }
    }

    return files;
  }

  function handleFiles(files: File[]) {
    const validated = validateFiles(files);
    if (!validated) return;

    const newPreviews = validated.map((file) => ({
      name: file.name,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      type: file.type,
    }));
    setPreviews(newPreviews);
    onFilesSelected(validated);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || analyzing) return;

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (!disabled && !analyzing) setDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleFiles(files);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function clearPreviews() {
    previews.forEach((p) => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    setPreviews([]);
    setValidationError(null);
  }

  if (analyzing) {
    return (
      <div
        className={cn(
          "border-2 border-dashed border-brand-primary/30 rounded-lg p-8 text-center bg-brand-primary/5",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner size="md" />
          <p className="text-sm font-medium text-brand-primary">Analyzing receipt with AI...</p>
          <p className="text-xs text-gray-400">This usually takes a few seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-brand-primary bg-brand-primary/5"
            : "border-gray-300 hover:border-brand-primary/50 hover:bg-gray-50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="w-14 h-14 rounded-full bg-brand-primary/10 flex items-center justify-center mx-auto mb-4">
          <CloudUpload className="w-7 h-7 text-brand-primary" />
        </div>
        <p className="text-base font-semibold text-gray-800 mb-1">
          Upload Receipts
        </p>
        <p className="text-sm text-gray-400">
          Drag &amp; drop images or PDFs here, or click to browse files.
        </p>
      </div>

      {validationError && (
        <p className="text-xs text-red-500 mt-2">{validationError}</p>
      )}

      {previews.length > 0 && (
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {previews.map((preview, i) => (
            <div
              key={i}
              className="relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center"
            >
              {preview.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileText className="w-6 h-6 text-gray-400" />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearPreviews();
            }}
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
