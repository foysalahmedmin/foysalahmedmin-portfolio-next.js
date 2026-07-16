import type { TFile } from "@/app/api/files/file.type";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withTransaction: vi.fn(),
  endSession: vi.fn(),
  findIdempotency: vi.fn(),
  findDuplicate: vi.fn(),
  createUploading: vi.fn(),
  finalize: vi.fn(),
  markFailure: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  failedCandidates: vi.fn(),
  markCleaned: vi.fn(),
  existingKeys: vi.fn(),
  storageKeyExists: vi.fn(),
  scanTargets: vi.fn(),
  listObjects: vi.fn(),
  removeUntracked: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  default: vi.fn(async () => ({
    startSession: vi.fn(async () => ({
      withTransaction: mocks.withTransaction,
      endSession: mocks.endSession,
    })),
  })),
}));

vi.mock("@/app/api/files/file.repository", () => ({
  findReadyByIdempotencyKey: mocks.findIdempotency,
  findReadyDuplicate: mocks.findDuplicate,
  createUploading: mocks.createUploading,
  finalizeUploadingById: mocks.finalize,
  markIngestionFailure: mocks.markFailure,
  findFailedIngestionCandidates: mocks.failedCandidates,
  markFailedIngestionCleaned: mocks.markCleaned,
  findExistingStorageKeys: mocks.existingKeys,
  storageKeyExists: mocks.storageKeyExists,
}));

vi.mock("@/app/api/files/managed-media.service", () => ({
  uploadPreparedMedia: mocks.upload,
  removeManagedMediaObject: mocks.remove,
  toStoredFileProvider: (provider: string) =>
    provider === "gcp" ? "gcs" : "cloudinary",
  getManagedMediaFailureCode: () => "STORAGE_DELETE_FAILED",
  createManagedMediaDelivery: vi.fn(),
  getManagedStorageScanTargets: mocks.scanTargets,
  listManagedMediaObjects: mocks.listObjects,
  removeUntrackedManagedMediaObject: mocks.removeUntracked,
}));

import {
  createManagedFiles,
  reconcileFailedManagedMedia,
} from "@/app/api/files/file.service";

const candidate = {
  buffer: Buffer.from("canonical"),
  original_name: "visual.png",
  filename: "visual.webp",
  mimetype: "image/webp",
  extension: "webp",
  size: 9,
  checksum: "ab".repeat(32),
  purpose: "project" as const,
  access: "public" as const,
  width: 640,
  height: 360,
  file_type: "image" as const,
  delivery: "inline" as const,
  field_name: "file",
  storage: {},
};

const fileRecord = (state: "uploading" | "ready"): TFile =>
  ({
    _id: { toString: () => "507f1f77bcf86cd799439011" },
    name: "visual",
    filename: "asset.webp",
    originalname: "visual.png",
    url: "https://res.cloudinary.com/cloud/image/upload/asset.webp",
    mimetype: "image/webp",
    size: 9,
    author: { toString: () => "507f1f77bcf86cd799439012" },
    provider: "cloudinary",
    status: "active",
    lifecycle_state: state,
    purpose: "project",
    access: "public",
    checksum: candidate.checksum,
    metadata: { storage_key: "v1/project/asset" },
  }) as unknown as TFile;

describe("managed-media staged ingestion compensation", () => {
  beforeEach(() => {
    mocks.findIdempotency.mockResolvedValue(null);
    mocks.findDuplicate.mockResolvedValue(null);
    mocks.withTransaction.mockImplementation(async (callback) => callback());
    mocks.endSession.mockResolvedValue(undefined);
    mocks.upload.mockResolvedValue({
      provider: "cloudinary",
      filename: "asset.webp",
      original_name: "visual.png",
      field_name: "file",
      storage_key: "v1/project/asset",
      public_url: "https://res.cloudinary.com/cloud/image/upload/asset.webp",
      size: 9,
      mimetype: "image/webp",
      uploaded_at: new Date(),
      resource_type: "image",
      format: "webp",
      width: 640,
      height: 360,
      immutable_key: "v1/project/asset",
    });
    mocks.createUploading.mockResolvedValue(fileRecord("uploading"));
    mocks.finalize.mockResolvedValue(fileRecord("ready"));
    mocks.markFailure.mockResolvedValue(true);
    mocks.remove.mockResolvedValue(undefined);
    mocks.failedCandidates.mockResolvedValue([]);
    mocks.markCleaned.mockResolvedValue(true);
    mocks.existingKeys.mockResolvedValue([]);
    mocks.storageKeyExists.mockResolvedValue(false);
    mocks.scanTargets.mockReturnValue([]);
    mocks.listObjects.mockResolvedValue([]);
    mocks.removeUntracked.mockResolvedValue(undefined);
  });

  it("reconciles only aged provider objects with no active or deleted File record", async () => {
    mocks.scanTargets.mockReturnValue([
      { provider: "gcp", bucket: "private-media", prefix: "v1/" },
    ]);
    mocks.listObjects.mockResolvedValue([
      {
        provider: "gcp",
        bucket: "private-media",
        storage_key: "v1/untracked",
        created_at: new Date(0),
      },
      {
        provider: "gcp",
        bucket: "private-media",
        storage_key: "v1/deleted-record-still-owns-object",
        created_at: new Date(0),
      },
    ]);
    mocks.existingKeys.mockResolvedValue([
      "v1/deleted-record-still-owns-object",
    ]);

    const result = await reconcileFailedManagedMedia();
    expect(mocks.removeUntracked).toHaveBeenCalledTimes(1);
    expect(mocks.removeUntracked).toHaveBeenCalledWith(
      expect.objectContaining({ storage_key: "v1/untracked" })
    );
    expect(result.untracked_objects).toMatchObject({
      inspected: 2,
      compensated: 1,
      failed_keys: [],
    });
  });

  it("reuses a ready checksum duplicate without a provider upload", async () => {
    mocks.findDuplicate.mockResolvedValue(fileRecord("ready"));
    const result = await createManagedFiles(
      { _id: "507f1f77bcf86cd799439012", name: "A", email: "a@example.com" },
      [candidate],
      {}
    );
    expect(result).toHaveLength(1);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("uploads, commits uploading metadata, then finalizes ready", async () => {
    const result = await createManagedFiles(
      { _id: "507f1f77bcf86cd799439012", name: "A", email: "a@example.com" },
      [candidate],
      { idempotency_key: "upload-request-0001" }
    );
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.createUploading).toHaveBeenCalledWith(
      expect.objectContaining({
        lifecycle_state: "uploading",
        checksum: candidate.checksum,
        purpose: "project",
      }),
      expect.anything()
    );
    expect(mocks.finalize).toHaveBeenCalledOnce();
    expect(result[0]?.lifecycle_state).toBe("ready");
  });

  it("removes the staged object when the database transaction fails", async () => {
    mocks.withTransaction.mockRejectedValue(new Error("db unavailable"));
    await expect(
      createManagedFiles(
        { _id: "507f1f77bcf86cd799439012", name: "A", email: "a@example.com" },
        [candidate],
        {}
      )
    ).rejects.toMatchObject({ status: 503 });
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it.each([
    { removalFails: false, state: "error", code: "FINALIZE_COMPENSATED" },
    { removalFails: true, state: "orphaned", code: "STORAGE_DELETE_FAILED" },
  ])(
    "records a durable $state state after finalization failure",
    async (fixture) => {
      mocks.finalize.mockResolvedValue(null);
      if (fixture.removalFails) {
        mocks.remove.mockRejectedValue(new Error("provider unavailable"));
      }
      await expect(
        createManagedFiles(
          {
            _id: "507f1f77bcf86cd799439012",
            name: "A",
            email: "a@example.com",
          },
          [candidate],
          {}
        )
      ).rejects.toMatchObject({ status: 503 });
      expect(mocks.markFailure).toHaveBeenCalledWith({
        id: "507f1f77bcf86cd799439011",
        state: fixture.state,
        error_code: fixture.code,
      });
    }
  );
});
