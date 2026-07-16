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

type FileGalleryUploaderProps = {
  value?: TFilePopulated[];
  onChange: (files: TFilePopulated[]) => void;
  accept?: string;
  maxSize?: number;
  maxCount?: number;
  className?: string;
  disabled?: boolean;
  purpose?: TFilePurpose;
  metadata?: TFileEditorialMetadataInput;
};

export function FileGalleryUploader({
  value = [],
  onChange,
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  maxSize = 5_000_000,
  maxCount = 10,
  className,
  disabled = false,
  purpose = "generic",
  metadata,
}: FileGalleryUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: File[]): Promise<TFilePopulated[]> => {
      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));
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
        throw new Error(data?.message || "Failed to upload files");
      }

      const data = (await res.json()) as TFileUploadResponse;
      if (!Array.isArray(data.data)) {
        throw new Error("Upload returned an invalid response");
      }
      return data.data;
    },
    [metadata, purpose]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (!files.length) return;

    const remaining = maxCount - value.length;
    if (remaining <= 0) {
      setError(`Maximum ${maxCount} files allowed.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    const oversized = toUpload.find((file) => file.size > maxSize);
    if (oversized) {
      setError(
        `"${oversized.name}" too large. Max ${Math.round(maxSize / 1_000_000)}MB.`
      );
      return;
    }
    setError(null);
    setUploading(true);

    try {
      const uploaded = await uploadFiles(toUpload);
      if (uploaded.length > 0) {
        onChange([...value, ...uploaded]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const canAdd = !disabled && value.length < maxCount;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((file, index) => (
            <div
              key={file._id}
              className="group border-border bg-muted relative aspect-square overflow-hidden rounded-md border"
            >
              {file.mimetype?.startsWith("image/") ? (
                <Image
                  src={file.url}
                  alt={file.is_decorative ? "" : file.alt_text || ""}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-2">
                  <span className="text-muted-foreground text-center text-xs break-all">
                    {file.filename}
                  </span>
                </div>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div
          role="button"
          tabIndex={uploading ? -1 : 0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) =>
            e.key === "Enter" && !uploading && inputRef.current?.click()
          }
          onDrop={(e) => {
            e.preventDefault();
            if (uploading) return;
            const files = Array.from(e.dataTransfer.files);
            if (files.length) {
              const dt = new DataTransfer();
              files.forEach((f) => dt.items.add(f));
              if (inputRef.current) {
                Object.defineProperty(inputRef.current, "files", {
                  value: dt.files,
                  writable: false,
                });
              }
              handleFileChange({
                target: { files: dt.files, value: "" },
              } as unknown as React.ChangeEvent<HTMLInputElement>);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-border flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed p-4 text-center transition-colors",
            uploading
              ? "cursor-wait opacity-60"
              : "hover:border-accent hover:bg-accent/5 cursor-pointer"
          )}
        >
          {uploading ? (
            <span className="text-muted-foreground text-sm">Uploading…</span>
          ) : (
            <>
              <span className="text-foreground text-sm font-medium">
                Add images
              </span>
              <span className="text-muted-foreground text-xs">
                {value.length}/{maxCount} · Max{" "}
                {Math.round(maxSize / 1_000_000)}MB each
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading || !canAdd}
      />

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
