"use client";

import { cn } from "@/lib/utils";
import type {
  TFilePopulated,
  TFileUploadResponse,
} from "@/types/file.type";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

type FileUploaderProps = {
  value?: TFilePopulated | null;
  onChange: (file: TFilePopulated | null) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
  label?: string;
};

export function FileUploader({
  value,
  onChange,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSize = 5_000_000,
  className,
  disabled = false,
  label = "Upload image",
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > maxSize) {
        setError(`File too large. Max ${Math.round(maxSize / 1_000_000)}MB.`);
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/files/cloud", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Upload failed");
        }

        const data = (await res.json()) as TFileUploadResponse;
        const uploaded = Array.isArray(data.data) ? data.data[0] : null;
        if (!uploaded) throw new Error("Upload returned no file");
        onChange(uploaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [maxSize, onChange],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
  };

  const isImage = value?.mimetype?.startsWith("image/");

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <div className="relative w-full rounded-md border border-border overflow-hidden">
          {isImage ? (
            <div className="relative w-full aspect-video bg-muted">
              <Image
                src={value.url}
                alt={value.filename}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-muted">
              <span className="text-sm text-muted-foreground truncate flex-1">
                {value.filename}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {(value.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}
          <div className="flex items-center justify-between p-2 bg-background border-t border-border">
            <span className="text-xs text-muted-foreground truncate max-w-[70%]">
              {value.filename}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-destructive hover:underline shrink-0 ml-2"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onKeyDown={(e) =>
            e.key === "Enter" && !disabled && !uploading && inputRef.current?.click()
          }
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-6 text-center transition-colors",
            uploading
              ? "cursor-wait opacity-60"
              : disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:border-accent hover:bg-accent/5",
          )}
        >
          {uploading ? (
            <span className="text-sm text-muted-foreground">Uploading…</span>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">
                Drag & drop or click to browse
              </span>
              <span className="text-xs text-muted-foreground">
                Max {Math.round(maxSize / 1_000_000)}MB
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
