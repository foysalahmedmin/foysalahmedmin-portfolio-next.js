"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  FormControl,
  FormControlHelper,
  FormControlLabel,
} from "@/components/ui/form-control";
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import {
  getMediaAccept,
  getMediaPurposeOption,
  MEDIA_LIBRARY_MAX_UPLOADS,
  MEDIA_PURPOSE_OPTIONS,
  MEDIA_SOURCE_OPTIONS,
} from "@/lib/admin/media-library";
import {
  uploadAdminMediaBatch,
  type MediaUploadOutcome,
} from "@/services/media-admin.service";
import type {
  TFilePopulated,
  TFilePurpose,
  TFileSource,
} from "@/types/file.type";
import { FilePlus2, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type Props = Readonly<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onUploaded: (files: readonly TFilePopulated[]) => void;
}>;

const getFileKey = (file: File) =>
  `${file.name}\0${file.size}\0${file.lastModified}`;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MediaUploadDialog = ({ isOpen, setIsOpen, onUploaded }: Props) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [purpose, setPurpose] = useState<TFilePurpose>("generic");
  const [source, setSource] = useState<TFileSource>("uploaded");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [outcomes, setOutcomes] = useState<MediaUploadOutcome[]>([]);
  const [error, setError] = useState<string | null>(null);

  const purposeOption = getMediaPurposeOption(purpose);
  const accept = getMediaAccept(purpose);

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setOutcomes([]);
      setError(null);
      setProgress({ completed: 0, total: 0 });
    }
  }, [isOpen]);

  const addFiles = (incoming: FileList | readonly File[]) => {
    if (uploading) return;
    setOutcomes([]);
    setError(null);
    setFiles((current) => {
      const deduplicated = new Map(
        [...current, ...Array.from(incoming)].map((file) => [
          getFileKey(file),
          file,
        ])
      );
      const next = Array.from(deduplicated.values()).slice(
        0,
        MEDIA_LIBRARY_MAX_UPLOADS
      );
      if (deduplicated.size > MEDIA_LIBRARY_MAX_UPLOADS) {
        setError(
          `A managed batch is limited to ${MEDIA_LIBRARY_MAX_UPLOADS} files.`
        );
      }
      return next;
    });
  };

  const selectedSize = useMemo(
    () => files.reduce((total, file) => total + file.size, 0),
    [files]
  );

  const submit = async () => {
    if (!files.length || uploading) return;
    setUploading(true);
    setError(null);
    setOutcomes([]);
    setProgress({ completed: 0, total: files.length });

    const result = await uploadAdminMediaBatch(
      files,
      { purpose, metadata: { source } },
      (completed, total) => setProgress({ completed, total })
    );
    setOutcomes(result);
    const successful = result.flatMap((outcome) =>
      outcome.status === "success" ? [outcome.file] : []
    );
    const failedKeys = new Set(
      result.flatMap((outcome) =>
        outcome.status === "error" ? [getFileKey(outcome.input)] : []
      )
    );
    setFiles((current) =>
      current.filter((file) => failedKeys.has(getFileKey(file)))
    );
    if (successful.length) onUploaded(successful);
    setUploading(false);
  };

  const successes = outcomes.filter(({ status }) => status === "success");
  const failures = outcomes.filter(
    (outcome): outcome is Extract<MediaUploadOutcome, { status: "error" }> =>
      outcome.status === "error"
  );

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (!uploading) setIsOpen(open);
      }}
      size="lg"
    >
      <ModalBackdrop className="grid p-4">
        <ModalContent className="max-h-[calc(100dvh-2rem)]">
          <ModalHeader>
            <div>
              <ModalTitle>Upload managed media</ModalTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Files are validated, canonicalized and stored by the configured
                provider adapter.
              </p>
            </div>
            <ModalCloseTrigger disabled={uploading} />
          </ModalHeader>

          <ModalBody className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormControlLabel htmlFor={`${inputId}-purpose`}>
                  Purpose
                </FormControlLabel>
                <FormControl
                  as="select"
                  id={`${inputId}-purpose`}
                  value={purpose}
                  disabled={uploading}
                  onChange={(event) => {
                    setPurpose(event.target.value as TFilePurpose);
                    setFiles([]);
                    setOutcomes([]);
                    setError(null);
                  }}
                >
                  {MEDIA_PURPOSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FormControl>
                <FormControlHelper>
                  {purposeOption.kind === "document" ? "PDF" : "Raster image"}
                  {" · "}
                  {purposeOption.access} delivery policy
                </FormControlHelper>
              </div>

              <div>
                <FormControlLabel htmlFor={`${inputId}-source`}>
                  Creation source
                </FormControlLabel>
                <FormControl
                  as="select"
                  id={`${inputId}-source`}
                  value={source}
                  disabled={uploading}
                  onChange={(event) =>
                    setSource(event.target.value as TFileSource)
                  }
                >
                  {MEDIA_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FormControl>
                <FormControlHelper>
                  Generated assets can receive provenance in the metadata editor
                  after upload.
                </FormControlHelper>
              </div>
            </div>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(event.dataTransfer.files);
              }}
              className="border-border bg-muted/20 focus-within:border-primary rounded-2xl border-2 border-dashed p-6 text-center"
            >
              <UploadCloud
                aria-hidden="true"
                className="text-primary mx-auto size-8"
              />
              <p className="mt-3 font-semibold">
                Choose up to {MEDIA_LIBRARY_MAX_UPLOADS} files
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                The selected purpose controls accepted type, dimensions, size
                and public/private delivery.
              </p>
              <label
                htmlFor={inputId}
                aria-disabled={uploading || undefined}
                className={buttonVariants({
                  variant: "outline",
                  className: `mt-4 ${uploading ? "pointer-events-none opacity-50" : ""}`,
                })}
              >
                <FilePlus2 aria-hidden="true" className="size-4" />
                Select files
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="file"
                multiple
                accept={accept}
                disabled={uploading}
                className="sr-only"
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <section aria-labelledby={`${inputId}-selection`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 id={`${inputId}-selection`} className="font-semibold">
                    Selected ({files.length})
                  </h3>
                  <span className="text-muted-foreground text-xs">
                    {formatBytes(selectedSize)} total
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {files.map((file) => (
                    <li
                      key={getFileKey(file)}
                      className="border-border flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {file.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatBytes(file.size)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        shape="icon"
                        disabled={uploading}
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setFiles((current) =>
                            current.filter(
                              (candidate) =>
                                getFileKey(candidate) !== getFileKey(file)
                            )
                          )
                        }
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {uploading && (
              <p role="status" aria-live="polite" className="text-sm">
                Processing {progress.completed} of {progress.total} through
                managed storage…
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="border-destructive/30 bg-destructive/10 text-destructive rounded-xl border px-4 py-3 text-sm"
              >
                {error}
              </p>
            )}

            {outcomes.length > 0 && (
              <section
                aria-live="polite"
                className="border-border rounded-2xl border p-4"
              >
                <p className="font-semibold">
                  {successes.length} uploaded · {failures.length} failed
                </p>
                {failures.length > 0 && (
                  <ul className="text-destructive mt-2 space-y-1 text-sm">
                    {failures.map((outcome) => (
                      <li key={getFileKey(outcome.input)}>
                        {outcome.input.name}: {outcome.message}
                      </li>
                    ))}
                  </ul>
                )}
                {failures.length > 0 && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    Successful files are already safe. Only failed files remain
                    selected for retry.
                  </p>
                )}
              </section>
            )}

            <div className="border-border bg-muted/30 flex gap-3 rounded-xl border p-3 text-sm">
              <ShieldCheck
                aria-hidden="true"
                className="text-primary mt-0.5 size-5 shrink-0"
              />
              <p className="text-muted-foreground">
                Provider credentials and storage object identifiers are never
                requested or displayed in this workspace.
              </p>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={uploading}
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              isLoading={uploading}
              disabled={!files.length}
              onClick={() => void submit()}
            >
              Upload {files.length || ""}{" "}
              {files.length === 1 ? "file" : "files"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </ModalBackdrop>
    </Modal>
  );
};

export default MediaUploadDialog;
