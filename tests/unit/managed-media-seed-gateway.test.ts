import { createManagedMediaSeedGateway } from "@/app/api/files/managed-media.seed-gateway";
import type { SeedMediaRequest } from "@/lib/seed";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ObjectId, type Db } from "mongodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(async () => undefined),
  createManagedFilesWithDisposition: vi.fn(),
  deleteFile: vi.fn(),
  deleteFilePermanent: vi.fn(),
  findReadyByIdempotencyKey: vi.fn(),
  findReadyDuplicate: vi.fn(),
  findByIdWithSensitiveProvenance: vi.fn(),
  prepareManagedMedia: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/files/file.repository", () => ({
  findReadyByIdempotencyKey: mocks.findReadyByIdempotencyKey,
  findReadyDuplicate: mocks.findReadyDuplicate,
  findByIdWithSensitiveProvenance: mocks.findByIdWithSensitiveProvenance,
}));
vi.mock("@/app/api/files/file.service", () => ({
  createManagedFilesWithDisposition: mocks.createManagedFilesWithDisposition,
  deleteFile: mocks.deleteFile,
  deleteFilePermanent: mocks.deleteFilePermanent,
}));
vi.mock("@/app/api/files/managed-media.service", () => ({
  prepareManagedMedia: mocks.prepareManagedMedia,
}));

const actorId = new ObjectId();
const createdId = new ObjectId();
const sourceBytes = Buffer.from("test-only repository media source");
const sourceChecksum = createHash("sha256").update(sourceBytes).digest("hex");
const preparedChecksum = "b".repeat(64);
const request: SeedMediaRequest = {
  media_key: "hero.system_design",
  purpose: "hero",
  source: {
    kind: "repository_file",
    relative_path: "heroes/system-design.png",
    source_sha256: sourceChecksum,
  },
  metadata: {
    name: "System design hero",
    source: "generated",
    is_decorative: true,
    alt_text: "",
    focal_point: { x: 0.68, y: 0.46 },
    dominant_color: "#153c5c",
    blur_data_url: "data:image/png;base64,Ymx1cg==",
    attribution: { license: "owned" },
    provenance: {
      generator: "OpenAI",
      model: "image-model",
      prompt: "A non-human system topology editorial visual",
      version: "hero-v1",
      seed: "documented-seed",
      generated_at: "2026-07-16T09:00:00.000Z",
    },
  },
};

/** Minimal stored file that satisfies assertReusableSeedFile */
const storedFile = {
  _id: createdId,
  lifecycle_state: "ready",
  status: "active",
  is_deleted: false,
  checksum: preparedChecksum,
  purpose: "hero",
  access: "public",
  mimetype: "image/webp",
  size: sourceBytes.length,
  metadata: { width: 2400, height: 1350, file_type: "image" },
  name: request.metadata.name,
  source: request.metadata.source,
  category: undefined,
  description: undefined,
  caption: undefined,
  alt_text: "",
  is_decorative: true,
  focal_point: { x: 0.68, y: 0.46 },
  dominant_color: "#153c5c",
  blur_data_url: "data:image/png;base64,Ymx1cg==",
  attribution: { license: "owned" },
  provenance: {
    generator: "OpenAI",
    model: "image-model",
    prompt: "A non-human system topology editorial visual",
    version: "hero-v1",
    seed: "documented-seed",
    generated_at: "2026-07-16T09:00:00.000Z",
    source_checksum: sourceChecksum,
  },
};

let assetRoot = "";

beforeEach(async () => {
  assetRoot = await mkdtemp(path.join(tmpdir(), "portfolio-seed-media-"));
  const heroes = path.join(assetRoot, "heroes");
  await mkdir(heroes);
  await writeFile(path.join(heroes, "system-design.png"), sourceBytes);

  mocks.findReadyDuplicate.mockResolvedValue(null);
  mocks.findReadyByIdempotencyKey.mockResolvedValue(null);
  mocks.prepareManagedMedia.mockResolvedValue({
    buffer: sourceBytes,
    original_name: "system-design.png",
    filename: "system-design.webp",
    mimetype: "image/webp",
    extension: "webp",
    size: sourceBytes.length,
    checksum: preparedChecksum,
    purpose: "hero",
    access: "public",
    width: 2400,
    height: 1350,
    file_type: "image",
    delivery: "inline",
  });
  mocks.createManagedFilesWithDisposition.mockResolvedValue([
    { file: storedFile, disposition: "created" },
  ]);
  mocks.findByIdWithSensitiveProvenance.mockResolvedValue(storedFile);
});

afterEach(async () => {
  await rm(assetRoot, { recursive: true, force: true });
});

describe("managed-media seed gateway", () => {
  it("forwards complete metadata through createManagedFilesWithDisposition with a non-PII actor adapter", async () => {
    const gateway = createManagedMediaSeedGateway({
      actor: { _id: actorId, role: "super-admin" },
      asset_root: assetRoot,
      repository_root: path.dirname(assetRoot),
      db: {} as Db,
    });

    await expect(gateway.stage(request)).resolves.toMatchObject({
      media_key: request.media_key,
      action: "created",
      file_id: createdId.toHexString(),
      source_sha256: sourceChecksum,
    });

    expect(mocks.createManagedFilesWithDisposition).toHaveBeenCalledOnce();
    expect(mocks.createManagedFilesWithDisposition.mock.calls[0]?.[0]).toEqual({
      _id: actorId.toHexString(),
      role: "super-admin",
      name: "Managed-media seed runner",
      email: "managed-media-seed@invalid.invalid",
    });
    expect(mocks.createManagedFilesWithDisposition.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        name: request.metadata.name,
        source: "generated",
        alt_text: "",
        is_decorative: true,
        focal_point: request.metadata.focal_point,
        dominant_color: request.metadata.dominant_color,
        blur_data_url: request.metadata.blur_data_url,
        attribution: request.metadata.attribution,
        provenance: {
          ...request.metadata.provenance,
          source_checksum: sourceChecksum,
        },
      })
    );
  });
});
