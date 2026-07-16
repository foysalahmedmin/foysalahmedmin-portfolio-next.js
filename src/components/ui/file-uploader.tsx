"use client";

import { cn } from "@/lib/utils";
import { appendFileUploadMetadata } from "@/lib/media/file-upload-metadata";
import type {
  TFileEditorialMetadataInput,
  TFilePopulated,
  TFilePurpose,
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
  purpose?: TFilePurpose;
  metadata?: TFileEditorialMetadataInput;
};

export function FileUploader({
  value,
  onChange,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSize = 5_000_000,
  className,
  disabled = false,
  label = "Upload image",
  purpose = "generic",
  metadata,
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
        formData.append("purpose", purpose);
        formData.append("idempotency_key", crypto.randomUUID());
        appendFileUploadMetadata(formData, metadata);

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
    [maxSize, metadata, onChange, purpose]
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
        <div className="border-border relative w-full overflow-hidden rounded-md border">
          {isImage ? (
            <div className="bg-muted relative aspect-video w-full">
              <Image
                src={value.url}
                alt={value.is_decorative ? "" : value.alt_text || ""}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : (
            <div className="bg-muted flex items-center gap-3 p-3">
              <span className="text-muted-foreground flex-1 truncate text-sm">
                {value.filename}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {(value.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}
          <div className="bg-background border-border flex items-center justify-between border-t p-2">
            <span className="text-muted-foreground max-w-[70%] truncate text-xs">
              {value.filename}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="text-destructive ml-2 shrink-0 text-xs hover:underline"
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
            e.key === "Enter" &&
            !disabled &&
            !uploading &&
            inputRef.current?.click()
          }
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-border flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors",
            uploading
              ? "cursor-wait opacity-60"
              : disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:border-accent hover:bg-accent/5 cursor-pointer"
          )}
        >
          {uploading ? (
            <span className="text-muted-foreground text-sm">Uploading…</span>
          ) : (
            <>
              <span className="text-foreground text-sm font-medium">
                {label}
              </span>
              <span className="text-muted-foreground text-xs">
                Drag & drop or click to browse
              </span>
              <span className="text-muted-foreground text-xs">
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

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
