import { assessFileMetadata } from "@/app/api/files/file.metadata";
import File from "@/app/api/files/file.model";
import { getReferencePurposes } from "@/app/api/files/file.service";
import type { TFile } from "@/app/api/files/file.type";
import {
  createFileValidationSchema,
  updateFileValidationSchema,
} from "@/app/api/files/file.validation";
import {
  deriveFileMetadataPatch,
  deriveLegacyFileProvider,
} from "@/lib/db/migrations/202607150009-file-metadata-provenance";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";
import { appendFileUploadMetadata } from "@/lib/media/file-upload-metadata";
import { FILE_PURPOSES } from "@/app/api/files/managed-media.policy";
import { describe, expect, it } from "vitest";

const checksum = "ab".repeat(32);
const blur = "data:image/webp;base64,AA==";

const completeGeneratedFile = (): Partial<TFile> => ({
  provider: "cloudinary",
  purpose: "hero",
  source: "generated",
  checksum,
  mimetype: "image/webp",
  alt_text: "Abstract system architecture flowing across five layers",
  focal_point: { x: 0.64, y: 0.48 },
  dominant_color: "#102a43",
  blur_data_url: blur,
  provenance: {
    generator: "OpenAI",
    model: "image-model",
    prompt: "A non-human technical editorial composition",
    version: "hero-v1",
  },
  attribution: { license: "owned" },
  metadata: { file_type: "image", width: 2400, height: 1350 },
});

describe("File editorial metadata health", () => {
  it("keeps schema purposes and sensitive provenance aligned with policy", () => {
    const purposePath = File.schema.path("purpose") as unknown as {
      enumValues: string[];
    };
    const promptPath = File.schema.path("provenance.prompt") as unknown as {
      options: { select?: boolean };
    };
    const seedPath = File.schema.path("provenance.seed") as unknown as {
      options: { select?: boolean };
    };
    const referencesPath = File.schema.path("references") as unknown as {
      schema: {
        path: (name: string) => { enumValues: string[] };
      };
    };

    expect(purposePath.enumValues).toEqual(FILE_PURPOSES);
    expect(promptPath.options.select).toBe(false);
    expect(seedPath.options.select).toBe(false);
    expect(referencesPath.schema.path("model").enumValues).toEqual(
      expect.arrayContaining([
        "Site",
        "Page",
        "Service",
        "SkillGroup",
        "Skill",
        "TimelineEntry",
        "Credential",
        "FAQ",
        "Testimonial",
        "LegalDocument",
      ])
    );
  });

  it("keeps legacy records readable without manufacturing a source", async () => {
    const legacy = new File({
      filename: "legacy.webp",
      originalname: "legacy.webp",
      name: "Legacy media",
      url: "",
      mimetype: "image/webp",
      size: 128,
      author: "507f1f77bcf86cd799439011",
      provider: "gcs",
      status: "active",
      access: "private",
    });

    await expect(legacy.validate()).resolves.toBeUndefined();
    expect(legacy.source).toBeUndefined();
  });

  it("maps planned entity references to purpose-compatible media", () => {
    expect(getReferencePurposes("Site", "pillar_visual")).toEqual(["hero"]);
    expect(getReferencePurposes("Site", "resume")).toEqual(["resume"]);
    expect(getReferencePurposes("Page", "seo_image")).toEqual(["social"]);
    expect(getReferencePurposes("Service", "visual")).toEqual(["service"]);
    expect(getReferencePurposes("Skill", "icon")).toEqual(["skill"]);
    expect(getReferencePurposes("Credential", "evidence")).toEqual([
      "credential",
      "document",
    ]);
    expect(getReferencePurposes("LegalDocument", "document")).toEqual([
      "document",
    ]);
  });

  it("recognizes a fully described generated raster without requiring invented fields", () => {
    expect(assessFileMetadata(completeGeneratedFile())).toEqual({
      metadata_status: "complete",
      metadata_missing: [],
    });
  });

  it("treats an explicitly decorative image with empty alt as intentional", () => {
    const file = completeGeneratedFile();
    file.is_decorative = true;
    file.alt_text = "";

    expect(assessFileMetadata(file).metadata_missing).not.toContain("alt_text");
  });

  it("flags missing rights and generated provenance instead of defaulting them", () => {
    const result = assessFileMetadata({
      provider: "gcs",
      purpose: "page",
      source: "generated",
      checksum,
      mimetype: "image/webp",
      metadata: { file_type: "image", width: 1200, height: 800 },
    });

    expect(result.metadata_status).toBe("incomplete");
    expect(result.metadata_missing).toEqual(
      expect.arrayContaining([
        "alt_text",
        "focal_point",
        "dominant_color",
        "blur_placeholder",
        "license",
        "generated_provenance",
      ])
    );
  });
});

describe("File metadata upload and edit DTOs", () => {
  it("round-trips flat multipart provenance into the typed upload input", () => {
    const parsed = createFileValidationSchema.parse({
      body: {
        purpose: "hero",
        source: "generated",
        alt_text: "Five connected technical capability layers",
        focal_point_x: "0.65",
        focal_point_y: "0.4",
        dominant_color: "#AABBCC",
        provenance_generator: "OpenAI",
        provenance_model: "image-model",
        provenance_prompt: "A technical editorial abstraction",
        provenance_version: "hero-v1",
        attribution_license: "owned",
      },
    }).body;

    expect(parsed).toMatchObject({
      purpose: "hero",
      source: "generated",
      focal_point: { x: 0.65, y: 0.4 },
      dominant_color: "#aabbcc",
      provenance: {
        generator: "OpenAI",
        model: "image-model",
        prompt: "A technical editorial abstraction",
        version: "hero-v1",
      },
      attribution: { license: "owned" },
    });
  });

  it("rejects partial focal points, unsafe attribution URLs, and decorative copy", () => {
    expect(() =>
      createFileValidationSchema.parse({
        body: { focal_point_x: "0.5" },
      })
    ).toThrow();
    expect(() =>
      updateFileValidationSchema.parse({
        params: { id: "507f1f77bcf86cd799439011" },
        body: {
          attribution: { source_url: "http://internal.test/asset" },
        },
      })
    ).toThrow();
    expect(() =>
      updateFileValidationSchema.parse({
        params: { id: "507f1f77bcf86cd799439011" },
        body: { is_decorative: true, alt_text: "Do not announce this" },
      })
    ).toThrow();
  });

  it("serializes the shared UI DTO without JSON blobs", () => {
    const formData = appendFileUploadMetadata(new FormData(), {
      source: "generated",
      focal_point: { x: 0.25, y: 0.75 },
      provenance: { prompt: "Prompt", version: "v2" },
      attribution: { license: "owned" },
    });

    expect(Object.fromEntries(formData.entries())).toEqual({
      source: "generated",
      focal_point_x: "0.25",
      focal_point_y: "0.75",
      provenance_prompt: "Prompt",
      provenance_version: "v2",
      attribution_license: "owned",
    });
  });
});

describe("File metadata migration compatibility", () => {
  it("registers the expand migration after the existing foundations", () => {
    const ids = MIGRATION_REGISTRY.map(({ id }) => id);
    const metadataIndex = ids.indexOf("202607150009-file-metadata-provenance");

    expect(metadataIndex).toBeGreaterThan(
      ids.indexOf("202607150008-auth-session-foundation")
    );
    expect(metadataIndex).toBeLessThan(
      ids.indexOf("202607150010-site-foundation")
    );
  });

  it("backfills only provider, dimensions, and source backed by legacy evidence", () => {
    const legacy = {
      url: "https://res.cloudinary.com/portfolio/image/upload/asset.webp",
      purpose: "hero",
      mimetype: "image/webp",
      checksum,
      width: 2400,
      height: 1350,
      metadata: {
        cloud_name: "portfolio",
        file_type: "image",
        source: "uploaded",
      },
    };

    expect(deriveLegacyFileProvider(legacy)).toBe("cloudinary");
    const patch = deriveFileMetadataPatch(legacy);
    expect(patch).toMatchObject({
      provider: "cloudinary",
      source: "uploaded",
      "metadata.width": 2400,
      "metadata.height": 1350,
      metadata_status: "incomplete",
    });
    expect(patch).not.toHaveProperty("alt_text");
    expect(patch).not.toHaveProperty("focal_point");
    expect(patch).not.toHaveProperty("dominant_color");
    expect(patch).not.toHaveProperty("blur_data_url");
    expect(patch).not.toHaveProperty("provenance");
    expect(patch).not.toHaveProperty("attribution");
  });

  it("does not choose a provider when legacy evidence conflicts", () => {
    const legacy = {
      url: "https://res.cloudinary.com/portfolio/image/upload/asset.webp",
      purpose: "hero",
      mimetype: "image/webp",
      checksum,
      metadata: { cloud_name: "portfolio", bucket: "another-provider" },
    };

    expect(deriveLegacyFileProvider(legacy)).toBeNull();
    const patch = deriveFileMetadataPatch(legacy);
    expect(patch).not.toHaveProperty("provider");
    expect(patch.metadata_missing).toContain("provider");
  });
});
