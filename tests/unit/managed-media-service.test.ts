import AppError from "@/builder/app-error";
import FileModel from "@/app/api/files/file.model";
import {
  acquireUploadConcurrencySlot,
  assertEarlyUploadRequest,
  prepareManagedMedia,
} from "@/app/api/files/managed-media.service";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const createRasterFile = async (input: {
  name?: string;
  type?: string;
  width?: number;
  height?: number;
}) => {
  const buffer = await sharp({
    create: {
      width: input.width ?? 640,
      height: input.height ?? 360,
      channels: 4,
      background: { r: 26, g: 35, b: 48, alpha: 0.7 },
    },
  })
    .png()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  return new File([buffer], input.name ?? "architecture.png", {
    type: input.type ?? "image/png",
  });
};

describe("managed-media validation and canonicalization", () => {
  it("allows a private record without a persisted public URL but requires one for public media", async () => {
    const base = {
      filename: "v1/resume/private.pdf",
      originalname: "resume.pdf",
      name: "Resume",
      mimetype: "application/pdf",
      size: 128,
      author: "507f1f77bcf86cd799439011",
      provider: "gcs" as const,
      status: "active" as const,
      lifecycle_state: "uploading" as const,
      purpose: "resume" as const,
      access: "private" as const,
      source: "uploaded" as const,
      storage_version: 1,
    };

    await expect(new FileModel(base).validate()).resolves.toBeUndefined();
    await expect(
      new FileModel({
        ...base,
        purpose: "project",
        access: "public",
      }).validate()
    ).rejects.toMatchObject({ errors: { url: expect.anything() } });
  });

  it("detects a raster signature, strips metadata, and emits canonical WebP", async () => {
    const prepared = await prepareManagedMedia({
      file: await createRasterFile({}),
      purpose: "project",
    });

    expect(prepared).toMatchObject({
      purpose: "project",
      access: "public",
      mimetype: "image/webp",
      extension: "webp",
      file_type: "image",
    });
    expect(prepared.checksum).toMatch(/^[a-f0-9]{64}$/);
    const metadata = await sharp(prepared.buffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it.each([
    { name: "photo.jpg", type: "image/png" },
    { name: "photo.png", type: "image/jpeg" },
    { name: "photo.exe", type: "image/png" },
  ])("rejects MIME/extension/signature disagreement: %#", async (overrides) => {
    await expect(
      prepareManagedMedia({
        file: await createRasterFile(overrides),
        purpose: "project",
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects SVG/HTML before any raster decoder can process it", async () => {
    const svg = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      ],
      "visual.svg",
      { type: "image/svg+xml" }
    );
    await expect(
      prepareManagedMedia({ file: svg, purpose: "logo" })
    ).rejects.toMatchObject({ status: 415 });
  });

  it("accepts only a bounded PDF envelope for the resume purpose", async () => {
    const validPdf = new File(
      ["%PDF-1.4\n1 0 obj\n<<>>\nendobj\nstartxref\n0\n%%EOF\n"],
      "resume.pdf",
      { type: "application/pdf" }
    );
    const prepared = await prepareManagedMedia({
      file: validPdf,
      purpose: "resume",
    });
    expect(prepared).toMatchObject({
      purpose: "resume",
      access: "private",
      mimetype: "application/pdf",
      delivery: "attachment",
    });

    const truncated = new File(["%PDF-1.4\n1 0 obj\n"], "resume.pdf", {
      type: "application/pdf",
    });
    await expect(
      prepareManagedMedia({ file: truncated, purpose: "resume" })
    ).rejects.toMatchObject({ status: 422 });
  });

  it("fails closed when purpose dimensions are not met", async () => {
    await expect(
      prepareManagedMedia({
        file: await createRasterFile({ width: 300, height: 200 }),
        purpose: "hero",
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});

describe("managed upload admission", () => {
  const originalRequestBytes = process.env.MEDIA_UPLOAD_MAX_REQUEST_BYTES;
  const originalConcurrency = process.env.MEDIA_UPLOAD_MAX_CONCURRENCY;

  afterEach(() => {
    process.env.MEDIA_UPLOAD_MAX_REQUEST_BYTES = originalRequestBytes;
    process.env.MEDIA_UPLOAD_MAX_CONCURRENCY = originalConcurrency;
  });

  it("requires a bounded multipart Content-Length before body parsing", () => {
    process.env.MEDIA_UPLOAD_MAX_REQUEST_BYTES = "100";
    const valid = new Request("http://localhost/upload", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=safe",
        "content-length": "100",
      },
    });
    expect(() => assertEarlyUploadRequest(valid)).not.toThrow();

    const invalidHeaders: Record<string, string>[] = [
      { "content-type": "multipart/form-data; boundary=safe" },
      {
        "content-type": "multipart/form-data; boundary=safe",
        "content-length": "101",
      },
      { "content-type": "application/json", "content-length": "20" },
    ];
    for (const headers of invalidHeaders) {
      const request = new Request("http://localhost/upload", {
        method: "POST",
        headers,
      });
      expect(() => assertEarlyUploadRequest(request)).toThrow(AppError);
    }
  });

  it("rejects process-local concurrency before a body is buffered", () => {
    process.env.MEDIA_UPLOAD_MAX_CONCURRENCY = "1";
    const release = acquireUploadConcurrencySlot();
    expect(() => acquireUploadConcurrencySlot()).toThrowError(
      expect.objectContaining({ status: 429 })
    );
    release();
    const releaseAgain = acquireUploadConcurrencySlot();
    releaseAgain();
  });
});
