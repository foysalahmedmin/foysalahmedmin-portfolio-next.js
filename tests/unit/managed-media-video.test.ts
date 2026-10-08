import FileModel from "@/app/api/files/file.model";
import {
  DEFAULT_VIDEO_UPLOAD_MAX_BYTES,
  MANAGED_MEDIA_PURPOSE_POLICIES,
  getManagedMediaPurposePolicy,
  isMediaPurposeCompatible,
} from "@/app/api/files/managed-media.policy";
import {
  getStorageResourceType,
  prepareManagedMedia,
} from "@/app/api/files/managed-media.service";
import { assessFileMetadata } from "@/app/api/files/file.metadata";
import { getReferencePurposes } from "@/app/api/files/file.service";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { toUploadFile } from "../helpers/media-fixtures";

describe("video upload policy", () => {
  it("keeps uploaded video under the serverless request-body cap", () => {
    // Vercel rejects request bodies over 4.5 MB before the route runs.
    expect(DEFAULT_VIDEO_UPLOAD_MAX_BYTES).toBeLessThan(4.5 * 1_000_000);
    expect(MANAGED_MEDIA_PURPOSE_POLICIES.video_file).toMatchObject({
      kind: "video",
      access: "public",
      accepted_mime_types: ["video/mp4", "video/webm"],
      accepted_extensions: ["mp4", "webm"],
      delivery: "inline",
    });
    expect(getManagedMediaPurposePolicy("video_file").max_input_bytes).toBe(
      DEFAULT_VIDEO_UPLOAD_MAX_BYTES
    );
  });

  it("keeps thumbnails and files apart so a video cannot stand in for an image", () => {
    expect(isMediaPurposeCompatible("video_file", ["video"])).toBe(false);
    expect(isMediaPurposeCompatible("video", ["video_file"])).toBe(false);
    expect(isMediaPurposeCompatible("case_study", ["video"])).toBe(false);
    expect(isMediaPurposeCompatible("video", ["video"])).toBe(true);
  });

  it("maps every reference field to the purpose that may be attached", () => {
    expect(getReferencePurposes("Video", "thumbnail")).toEqual(["video"]);
    expect(getReferencePurposes("Video", "video_file")).toEqual(["video_file"]);
    expect(getReferencePurposes("VideoCategory", "image")).toEqual(["video"]);
    expect(getReferencePurposes("CaseStudy", "thumbnail")).toEqual([
      "case_study",
    ]);
    expect(getReferencePurposes("CaseStudy", "images")).toEqual(["case_study"]);
    expect(getReferencePurposes("CaseStudyCategory", "image")).toEqual([
      "case_study",
    ]);
  });

  it("resolves the storage resource type from the MIME type", () => {
    expect(getStorageResourceType("video/mp4")).toBe("video");
    expect(getStorageResourceType("video/webm")).toBe("video");
    expect(getStorageResourceType("application/pdf")).toBe("raw");
    expect(getStorageResourceType("image/webp")).toBe("image");
  });

  it("lets the File model reference the new owners", async () => {
    const base = {
      filename: "v1/video_file/abc/clip.mp4",
      originalname: "clip.mp4",
      name: "clip",
      mimetype: "video/mp4",
      size: 1_801,
      url: "https://res.cloudinary.com/test-cloud/video/upload/v1/clip.mp4",
      author: "507f1f77bcf86cd799439011",
      provider: "cloudinary" as const,
      status: "active" as const,
      lifecycle_state: "ready" as const,
      purpose: "video_file" as const,
      access: "public" as const,
      source: "uploaded" as const,
      storage_version: 1,
    };
    const file = new FileModel({
      ...base,
      references: [
        {
          model: "Video",
          entity: "507f1f77bcf86cd799439012",
          field: "video_file",
        },
        {
          model: "CaseStudy",
          entity: "507f1f77bcf86cd799439013",
          field: "images",
        },
      ],
    });
    await expect(file.validate()).resolves.toBeUndefined();
    await expect(
      new FileModel({
        ...base,
        references: [
          { model: "Podcast", entity: "507f1f77bcf86cd799439012", field: "x" },
        ],
      }).validate()
    ).rejects.toBeDefined();
  });
});

describe("video upload preparation", () => {
  it("accepts a real MP4 and reports its displayed size and duration", async () => {
    const prepared = await prepareManagedMedia({
      file: toUploadFile("landscape.mp4"),
      purpose: "video_file",
    });
    expect(prepared).toMatchObject({
      purpose: "video_file",
      access: "public",
      mimetype: "video/mp4",
      extension: "mp4",
      file_type: "video",
      width: 64,
      height: 36,
      duration: 1,
      delivery: "inline",
    });
    expect(prepared.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(prepared.filename).toBe("landscape.mp4");
  });

  it("reads a phone-style rotated clip as the portrait it plays as", async () => {
    const prepared = await prepareManagedMedia({
      file: toUploadFile("rotated.mp4"),
      purpose: "video_file",
    });
    expect(prepared).toMatchObject({ width: 36, height: 64 });
  });

  it("accepts a real WebM without inventing metadata for it", async () => {
    const prepared = await prepareManagedMedia({
      file: toUploadFile("clip.webm"),
      purpose: "video_file",
    });
    expect(prepared).toMatchObject({
      mimetype: "video/webm",
      extension: "webm",
      file_type: "video",
    });
    expect(prepared.width).toBeUndefined();
    expect(prepared.duration).toBeUndefined();
  });

  it("stores the bytes untouched (no transcoding)", async () => {
    const file = toUploadFile("portrait.mp4");
    const prepared = await prepareManagedMedia({ file, purpose: "video_file" });
    expect(
      Buffer.compare(prepared.buffer, Buffer.from(await file.arrayBuffer()))
    ).toBe(0);
  });

  it.each([
    ["extension disagrees with the signature", { filename: "clip.webm" }],
    ["MIME disagrees with the signature", { type: "video/webm" }],
    [
      "unsupported extension",
      { filename: "clip.mov", type: "video/quicktime" },
    ],
  ])("rejects an MP4 when the %s", async (_label, options) => {
    await expect(
      prepareManagedMedia({
        file: toUploadFile("landscape.mp4", options),
        purpose: "video_file",
      })
    ).rejects.toMatchObject({ status: 415 });
  });

  it("rejects video bytes for an image purpose and image bytes for the video purpose", async () => {
    await expect(
      prepareManagedMedia({
        file: toUploadFile("landscape.mp4"),
        purpose: "video",
      })
    ).rejects.toMatchObject({ status: 415 });

    const png = await sharp({
      create: { width: 640, height: 360, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
    await expect(
      prepareManagedMedia({
        file: new File([new Uint8Array(png)], "poster.png", {
          type: "image/png",
        }),
        purpose: "video_file",
      })
    ).rejects.toMatchObject({ status: 415 });
  });

  it("rejects files that are not video at all, even with a video name", async () => {
    await expect(
      prepareManagedMedia({
        file: new File(["<html><script>alert(1)</script></html>"], "clip.mp4", {
          type: "video/mp4",
        }),
        purpose: "video_file",
      })
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      prepareManagedMedia({
        file: new File([new Uint8Array(64)], "clip.mp4", { type: "video/mp4" }),
        purpose: "video_file",
      })
    ).rejects.toMatchObject({ status: 415 });
  });

  it("enforces the size limit before reading the file", async () => {
    const tooLarge = new File(
      [new Uint8Array(DEFAULT_VIDEO_UPLOAD_MAX_BYTES + 1)],
      "big.mp4",
      { type: "video/mp4" }
    );
    await expect(
      prepareManagedMedia({ file: tooLarge, purpose: "video_file" })
    ).rejects.toMatchObject({ status: 413 });
  });
});

describe("video file metadata health", () => {
  it("needs only provenance and a license, never alt text or a focal point", () => {
    const base = {
      provider: "cloudinary" as const,
      purpose: "video_file" as const,
      source: "uploaded" as const,
      checksum: "a".repeat(64),
      mimetype: "video/mp4",
      metadata: { file_type: "video" as const },
    };
    expect(assessFileMetadata(base)).toEqual({
      metadata_status: "incomplete",
      metadata_missing: ["license"],
    });
    expect(
      assessFileMetadata({ ...base, attribution: { license: "owned" } })
    ).toEqual({ metadata_status: "complete", metadata_missing: [] });
  });
});
