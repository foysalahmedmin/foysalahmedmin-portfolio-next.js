import { FILE_PURPOSES } from "@/app/api/files/managed-media.policy";
import { getAdminPageCapability } from "@/lib/auth/capabilities";
import {
  buildMediaLibrarySearchParams,
  buildMediaMetadataFormValues,
  buildMediaMetadataPayload,
  isMediaPermanentlyDeletable,
  isMediaSoftDeletable,
  MEDIA_LIBRARY_MAX_UPLOADS,
  MEDIA_PURPOSE_OPTIONS,
  normalizeMediaLibraryQuery,
  validateMediaMetadataForm,
} from "@/lib/admin/media-library";
import type { TFilePopulated } from "@/types/file.type";
import { describe, expect, it } from "vitest";

const file = (patch: Partial<TFilePopulated> = {}): TFilePopulated => ({
  _id: "507f1f77bcf86cd799439011",
  url: "https://res.cloudinary.com/demo/image/upload/media.webp",
  filename: "media.webp",
  originalname: "media.png",
  name: "System composition",
  mimetype: "image/webp",
  size: 1024,
  provider: "cloudinary",
  purpose: "hero",
  access: "public",
  source: "generated",
  status: "active",
  lifecycle_state: "ready",
  alt_text: "Five connected system layers",
  is_decorative: false,
  focal_point: { x: 0.5, y: 0.5 },
  dominant_color: "#102a43",
  attribution: { license: "owned" },
  provenance: {
    generator: "OpenAI",
    model: "image-model",
    version: "hero-v1",
  },
  metadata: { file_type: "image", width: 1600, height: 900 },
  references: [],
  ...patch,
});

describe("media admin library policy", () => {
  it("covers every managed purpose and keeps a bounded upload batch", () => {
    expect(MEDIA_PURPOSE_OPTIONS.map(({ value }) => value)).toEqual(
      FILE_PURPOSES
    );
    expect(MEDIA_LIBRARY_MAX_UPLOADS).toBe(10);
    expect(
      MEDIA_PURPOSE_OPTIONS.filter(({ access }) => access === "private").map(
        ({ value }) => value
      )
    ).toEqual(["resume", "document", "generic"]);
  });

  it("normalizes server query state to allowlisted bounded values", () => {
    const query = normalizeMediaLibraryQuery({
      search: `  ${"a".repeat(120)}  `,
      sort: "$where",
      page: -4,
      limit: 10_000,
      filters: {
        provider: "cloudinary",
        purpose: "hero",
        metadata_missing: "alt_text",
        deleted_scope: "only_deleted",
        access: "credential-leak",
      },
    });

    expect(query).toMatchObject({
      search: "a".repeat(100),
      sort: "-updated_at",
      page: 1,
      limit: 100,
      filters: {
        provider: "cloudinary",
        purpose: "hero",
        metadata_missing: "alt_text",
        deleted_scope: "only_deleted",
      },
    });
    expect(query.filters).not.toHaveProperty("access");
    expect(Object.fromEntries(buildMediaLibrarySearchParams(query))).toEqual({
      page: "1",
      limit: "100",
      sort: "-updated_at",
      search: "a".repeat(100),
      provider: "cloudinary",
      purpose: "hero",
      metadata_missing: "alt_text",
      deleted_scope: "only_deleted",
    });
  });

  it("enforces the decorative/alt invariant and safe attribution URLs", () => {
    const values = {
      ...buildMediaMetadataFormValues(file()),
      is_decorative: true,
      alt_text: "This must not be announced",
      attribution_source_url: "http://internal.test/source",
      focal_point_x: "1.2",
    };

    expect(validateMediaMetadataForm(file(), values)).toMatchObject({
      alt_text: expect.any(String),
      attribution_source_url: expect.any(String),
      focal_point_x: expect.any(String),
    });

    const decorative = {
      ...values,
      alt_text: "",
      attribution_source_url: "https://example.com/source",
      focal_point_x: "0.6",
    };
    expect(validateMediaMetadataForm(file(), decorative)).toEqual({});
    expect(buildMediaMetadataPayload(file(), decorative)).toMatchObject({
      is_decorative: true,
      alt_text: "",
      focal_point: { x: 0.6, y: 0.5 },
      attribution: { source_url: "https://example.com/source" },
    });
  });

  it("keeps sensitive provenance read-only while accepting a write-only prompt", () => {
    const source = file({
      provenance: {
        generator: "OpenAI",
        model: "image-model",
        version: "v1",
        prompt: "must not reach the client form",
        seed: "must not reach the client form",
      },
    });
    const values = buildMediaMetadataFormValues(source);
    expect(values.provenance_prompt).toBe("");
    expect(values).not.toHaveProperty("provenance_seed");

    const payload = buildMediaMetadataPayload(source, {
      ...values,
      provenance_prompt: "A safe non-human editorial composition",
    });
    expect(payload.provenance).toMatchObject({
      prompt: "A safe non-human editorial composition",
    });
    expect(payload.provenance).not.toHaveProperty("seed");
    expect(payload).not.toHaveProperty("provider");
    expect(payload).not.toHaveProperty("metadata");
  });

  it("makes deletion eligibility reference-aware and capability mapped", () => {
    expect(isMediaSoftDeletable(file())).toBe(true);
    expect(
      isMediaSoftDeletable(
        file({
          references: [
            {
              model: "Page",
              entity: "507f1f77bcf86cd799439012",
              field: "hero_visual",
            },
          ],
        })
      )
    ).toBe(false);
    expect(isMediaPermanentlyDeletable(file({ is_deleted: true }))).toBe(true);
    expect(getAdminPageCapability("/admin/media")).toBe("media:manage");
    expect(getAdminPageCapability("/admin/media/health")).toBe("media:manage");
  });
});
