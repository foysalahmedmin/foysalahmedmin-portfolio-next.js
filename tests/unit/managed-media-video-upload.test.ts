import { describe, expect, it, vi } from "vitest";
import { readMediaFixture } from "../helpers/media-fixtures";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getStorageAdapter: () => ({
      provider: "cloudinary" as const,
      upload: mocks.upload,
      remove: mocks.remove,
    }),
    getConfiguredStorageProvider: () => "cloudinary" as const,
    deleteCloudStorageObject: mocks.remove,
  };
});

import {
  prepareManagedMedia,
  removeManagedMediaObject,
  uploadPreparedMedia,
} from "@/app/api/files/managed-media.service";
import type { TFile } from "@/app/api/files/file.type";

const prepare = async () =>
  prepareManagedMedia({
    file: new File([new Uint8Array(readMediaFixture("landscape.mp4"))], "clip.mp4", {
      type: "video/mp4",
    }),
    purpose: "video_file",
  });

const cloudinaryResult = (overrides: Record<string, unknown> = {}) => ({
  provider: "cloudinary" as const,
  field_name: "file",
  original_name: "clip.mp4",
  filename: "clip.mp4",
  storage_key: "portfolio-test/v1/video_file/x/ab/key",
  public_url:
    "https://res.cloudinary.com/test-cloud/video/upload/v1/portfolio-test/v1/video_file/x/ab/key.mp4",
  size: 1_801,
  mimetype: "video/mp4",
  uploaded_at: new Date(),
  cloud_name: "test-cloud",
  resource_type: "video" as const,
  delivery_type: "upload",
  format: "mp4",
  ...overrides,
});

describe("uploading a prepared video", () => {
  it("accepts a consistent Cloudinary video asset", async () => {
    const prepared = await prepare();
    mocks.upload.mockResolvedValue(cloudinaryResult({ size: prepared.size }));
    const stored = await uploadPreparedMedia({
      prepared,
      owner_id: "507f1f77bcf86cd799439011",
      ingestion_scope: "0123456789abcdef",
    });
    expect(stored.public_url).toContain("/video/upload/");
    expect(stored.immutable_key).toContain("/video_file/");
    expect(mocks.remove).not.toHaveBeenCalled();
    // The adapter receives the original bytes and the real MIME type.
    expect(mocks.upload.mock.calls[0]![0]).toMatchObject({
      mimetype: "video/mp4",
      access: "public",
    });
  });

  it.each([
    ["an image resource", { resource_type: "image" }],
    ["a different format", { format: "webm" }],
    ["a different size", { size: 5 }],
  ])("compensates and fails when the provider returns %s", async (_label, override) => {
    const prepared = await prepare();
    mocks.upload.mockResolvedValue(
      cloudinaryResult({ size: prepared.size, ...override })
    );
    await expect(
      uploadPreparedMedia({
        prepared,
        owner_id: "507f1f77bcf86cd799439011",
        ingestion_scope: "0123456789abcdef",
      })
    ).rejects.toMatchObject({ status: 502 });
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });

  it("refuses a delivery URL outside the configured Cloudinary account", async () => {
    const prepared = await prepare();
    mocks.upload.mockResolvedValue(
      cloudinaryResult({
        size: prepared.size,
        public_url: "https://evil.example/test-cloud/video/upload/clip.mp4",
      })
    );
    await expect(
      uploadPreparedMedia({
        prepared,
        owner_id: "507f1f77bcf86cd799439011",
        ingestion_scope: "0123456789abcdef",
      })
    ).rejects.toMatchObject({ status: 502 });
  });
});

describe("deleting a stored video", () => {
  it("removes it as a video resource even without stored resource metadata", async () => {
    mocks.remove.mockClear();
    await removeManagedMediaObject({
      _id: "507f1f77bcf86cd799439011",
      filename: "clip.mp4",
      originalname: "clip.mp4",
      name: "clip",
      url: "https://res.cloudinary.com/test-cloud/video/upload/clip.mp4",
      mimetype: "video/mp4",
      size: 1_801,
      author: "507f1f77bcf86cd799439012",
      provider: "cloudinary",
      status: "active",
      lifecycle_state: "ready",
      purpose: "video_file",
      access: "public",
      metadata: { storage_key: "portfolio-test/v1/clip", delivery_type: "upload" },
    } as unknown as TFile);
    expect(mocks.remove).toHaveBeenCalledWith(
      expect.objectContaining({ resource_type: "video", provider: "cloudinary" })
    );
  });
});
