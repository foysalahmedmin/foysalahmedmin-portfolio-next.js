import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    deleteCloudStorageObject: mocks.remove,
  };
});

import { removeManagedMediaObject } from "@/app/api/files/managed-media.service";
import type { TFile } from "@/app/api/files/file.type";

const storedFile = (provider: "gcs" | "cloudinary"): TFile =>
  ({
    _id: "507f1f77bcf86cd799439011",
    filename: "asset.webp",
    originalname: "asset.png",
    name: "asset",
    url: "https://example.invalid/asset",
    mimetype: "image/webp",
    size: 42,
    author: "507f1f77bcf86cd799439012",
    provider,
    status: "active",
    lifecycle_state: "ready",
    purpose: "project",
    access: "public",
    metadata: {
      storage_key: `${provider}/v1/asset`,
      bucket: provider === "gcs" ? "stored-bucket" : undefined,
      resource_type: "image",
      delivery_type: "upload",
    },
  }) as unknown as TFile;

describe("stored-provider deletion routing", () => {
  it.each([
    ["gcs", "gcp"],
    ["cloudinary", "cloudinary"],
  ] as const)(
    "uses record provider %s even if runtime default differs",
    async (stored, expected) => {
      mocks.remove.mockClear();
      await removeManagedMediaObject(storedFile(stored));
      expect(mocks.remove).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: expected,
          storage_key: `${stored}/v1/asset`,
        })
      );
    }
  );
});
