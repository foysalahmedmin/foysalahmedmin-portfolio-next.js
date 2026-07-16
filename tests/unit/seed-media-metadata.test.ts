import {
  validateSeedManifest,
  type SeedManifest,
  type SeedMediaRequest,
} from "@/lib/seed";
import { describe, expect, it } from "vitest";

const truth = {
  content_tier: "foundation",
  truth_status: "verified_by_code",
  publication_policy: "draft_only",
  synthetic: false,
} as const;

const request: SeedMediaRequest = {
  media_key: "hero.system_design",
  purpose: "hero",
  source: {
    kind: "repository_file",
    relative_path: "heroes/system-design.png",
    source_sha256: "a".repeat(64),
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

const manifestWith = (media: SeedMediaRequest): SeedManifest => ({
  manifest_key: "managed-media-metadata-test",
  seed_version: 1,
  mode: "foundation",
  description: "Validates complete managed-media seed metadata.",
  truth,
  media: [media],
  records: [],
});

describe("managed-media seed metadata", () => {
  it("accepts complete, bounded generated raster metadata", () => {
    expect(validateSeedManifest(manifestWith(request))).toEqual(
      manifestWith(request)
    );
  });

  it.each([
    "focal_point",
    "dominant_color",
    "blur_data_url",
    "attribution",
    "provenance",
  ] as const)("rejects repository raster media missing %s", (field) => {
    const metadata = { ...request.metadata };
    delete metadata[field];

    expect(() =>
      validateSeedManifest(manifestWith({ ...request, metadata }))
    ).toThrowError(
      expect.objectContaining({
        code: "SEED_MANIFEST_INVALID",
        details: expect.arrayContaining([
          `hero.system_design.metadata.${field}`,
        ]),
      })
    );
  });

  it("requires credit evidence for attribution-dependent licenses", () => {
    const media: SeedMediaRequest = {
      ...request,
      metadata: {
        ...request.metadata,
        attribution: { license: "cc-by-4.0" },
      },
    };

    expect(() => validateSeedManifest(manifestWith(media))).toThrowError(
      expect.objectContaining({ code: "SEED_MANIFEST_INVALID" })
    );
  });

  it("keeps pending generated requests valid without invented metadata", () => {
    const pending: SeedMediaRequest = {
      media_key: "hero.pending",
      purpose: "hero",
      source: {
        kind: "pending_generated",
        requirement: "A reviewed non-human hero visual.",
      },
      metadata: {
        name: "Pending hero",
        source: "generated",
      },
    };

    expect(() => validateSeedManifest(manifestWith(pending))).not.toThrow();
  });
});
