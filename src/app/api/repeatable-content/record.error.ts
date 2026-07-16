import AppError from "@/builder/app-error";

export class ContentRecordError extends AppError {
  readonly code: string;
  readonly sources: Array<{ path: string | number; message: string }>;
  readonly current_version?: number;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    sources?: Array<{ path: string | number; message: string }>;
    current_version?: number;
  }) {
    super(input.status, input.message);
    this.name = "ContentRecordError";
    this.code = input.code;
    this.sources = input.sources?.slice(0, 50) ?? [];
    this.current_version = input.current_version;
  }
}

export const versionConflict = (currentVersion?: number) =>
  new ContentRecordError({
    status: 409,
    code: "VERSION_CONFLICT",
    message: "The record changed. Reload it and retry your edit.",
    ...(currentVersion !== undefined
      ? { current_version: currentVersion }
      : {}),
  });
