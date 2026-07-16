import AppError from "@/builder/app-error";
import {
  FILE_PURPOSES,
  MANAGED_MEDIA_PURPOSE_POLICIES,
  assertAllowedProviderUrl,
  buildImmutableStorageKey,
  buildMediaOwnerScope,
  canTransitionMediaLifecycle,
  clampPrivateDeliveryTtl,
  getFilenameExtension,
  getManagedMediaPurposePolicy,
  getSafeStorageErrorCode,
  isAttachableMediaRecord,
  isFilePurpose,
  isMediaPurposeCompatible,
  normalizeMediaFilename,
  normalizeMediaMime,
} from "@/app/api/files/managed-media.policy";
import type {
  TFileLifecycleState,
  TFilePurpose,
} from "@/app/api/files/file.type";
import { describe, expect, it } from "vitest";

const MiB = 1_048_576;

describe("managed-media purpose policy", () => {
  it("defines every supported purpose exactly once", () => {
    expect(FILE_PURPOSES).toEqual([
      "logo",
      "hero",
      "project",
      "article",
      "profile",
      "resume",
      "page",
      "service",
      "skill",
      "timeline",
      "credential",
      "testimonial",
      "social",
      "document",
      "generic",
    ]);
    expect(Object.keys(MANAGED_MEDIA_PURPOSE_POLICIES)).toEqual(FILE_PURPOSES);

    for (const purpose of FILE_PURPOSES) {
      expect(MANAGED_MEDIA_PURPOSE_POLICIES[purpose].purpose).toBe(purpose);
      expect(MANAGED_MEDIA_PURPOSE_POLICIES[purpose].allow_animation).toBe(
        false
      );
    }
  });

  it("keeps raster purposes bounded and excludes active or animated formats", () => {
    for (const purpose of FILE_PURPOSES) {
      const policy = MANAGED_MEDIA_PURPOSE_POLICIES[purpose];
      if (policy.kind === "pdf") continue;
      expect(policy.kind).toBe("raster");
      expect(policy.accepted_mime_types).toEqual([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ]);
      expect(policy.accepted_mime_types).not.toContain("image/gif");
      expect(policy.accepted_mime_types).not.toContain("image/svg+xml");
      expect(policy.accepted_mime_types).not.toContain("text/html");
      expect(policy.max_input_bytes).toBeGreaterThan(0);
      expect(policy.max_output_bytes).toBeGreaterThan(0);
      expect(policy.max_pixels).toBeGreaterThan(0);
    }
  });

  it("uses the approved limits, access classes, and delivery modes", () => {
    expect(MANAGED_MEDIA_PURPOSE_POLICIES.logo).toMatchObject({
      access: "public",
      max_input_bytes: 2 * MiB,
      max_output_bytes: 2 * MiB,
      max_pixels: 16_000_000,
      delivery: "inline",
    });
    expect(MANAGED_MEDIA_PURPOSE_POLICIES.hero).toMatchObject({
      access: "public",
      max_input_bytes: 8 * MiB,
      min_width: 800,
      min_height: 450,
      max_pixels: 40_000_000,
    });

    for (const purpose of ["project", "article"] as const) {
      expect(MANAGED_MEDIA_PURPOSE_POLICIES[purpose]).toMatchObject({
        access: "public",
        max_input_bytes: 8 * MiB,
        min_width: 320,
        min_height: 180,
        max_pixels: 40_000_000,
      });
    }

    expect(MANAGED_MEDIA_PURPOSE_POLICIES.profile).toMatchObject({
      access: "public",
      max_input_bytes: 5 * MiB,
      min_width: 128,
      min_height: 128,
      max_pixels: 20_000_000,
    });
    expect(MANAGED_MEDIA_PURPOSE_POLICIES.resume).toMatchObject({
      kind: "pdf",
      access: "private",
      accepted_mime_types: ["application/pdf"],
      accepted_extensions: ["pdf"],
      max_input_bytes: 5 * MiB,
      delivery: "attachment",
    });
    expect(MANAGED_MEDIA_PURPOSE_POLICIES.generic).toMatchObject({
      kind: "raster",
      access: "private",
      max_input_bytes: 10 * MiB,
      max_pixels: 40_000_000,
    });
  });

  it("validates unknown purposes with a safe client error", () => {
    expect(isFilePurpose("project")).toBe(true);
    expect(isFilePurpose("video")).toBe(false);
    expect(isFilePurpose({ purpose: "project" })).toBe(false);
    expect(getManagedMediaPurposePolicy("resume")).toBe(
      MANAGED_MEDIA_PURPOSE_POLICIES.resume
    );

    expect(() => getManagedMediaPurposePolicy("../project")).toThrowError(
      expect.objectContaining<Partial<AppError>>({
        status: 400,
        message: "Unsupported media purpose",
      })
    );
  });
});

describe("managed-media normalization and immutable keys", () => {
  it("normalizes known MIME aliases, case, and whitespace", () => {
    expect(normalizeMediaMime(" IMAGE/JPG ")).toBe("image/jpeg");
    expect(normalizeMediaMime("image/x-png")).toBe("image/png");
    expect(normalizeMediaMime(" Application/PDF ")).toBe("application/pdf");
  });

  it("reduces untrusted filenames to a safe leaf without hiding the extension", () => {
    expect(normalizeMediaFilename("../../Resume <script>.PDF")).toBe(
      "Resume-script.pdf"
    );
    expect(normalizeMediaFilename("C:\\fakepath\\portrait.PNG")).toBe(
      "portrait.png"
    );
    expect(normalizeMediaFilename("payload.php.JpG")).toBe("payload-php.jpg");
    expect(normalizeMediaFilename("\u0000\u001f")).toBe("media");
    expect(getFilenameExtension("C:\\fakepath\\portrait.PNG")).toBe("png");
  });

  it("bounds long display filenames", () => {
    const normalized = normalizeMediaFilename(`${"a".repeat(200)}.jpeg`);
    expect(normalized).toBe(`${"a".repeat(80)}.jpeg`);
    expect(normalized).not.toContain("/");
    expect(normalized).not.toContain("\\");
  });

  it("builds a deterministic non-reversible owner scope", () => {
    const first = buildMediaOwnerScope("507f1f77bcf86cd799439011");
    const second = buildMediaOwnerScope("507f1f77bcf86cd799439012");

    expect(first).toMatch(/^[a-f0-9]{16}$/);
    expect(buildMediaOwnerScope("507f1f77bcf86cd799439011")).toBe(first);
    expect(second).not.toBe(first);
    expect(first).not.toContain("507f1f77");
  });

  it("builds deterministic versioned keys without user-controlled filenames", () => {
    const checksum = "ab".repeat(32);
    const ownerScope = "cd".repeat(8);

    expect(
      buildImmutableStorageKey({
        owner_scope: ownerScope.toUpperCase(),
        checksum: checksum.toUpperCase(),
        purpose: "project",
      })
    ).toBe(`v1/project/${ownerScope}/ab/${checksum}`);
    expect(
      buildImmutableStorageKey({
        owner_scope: ownerScope,
        checksum,
        purpose: "article",
        version: 3,
      })
    ).toBe(`v3/article/${ownerScope}/ab/${checksum}`);
    expect(
      buildImmutableStorageKey({
        owner_scope: ownerScope,
        checksum,
        purpose: "article",
        ingestion_scope: "ef".repeat(8),
      })
    ).toBe(`v1/article/${ownerScope}/ab/${checksum}-${"ef".repeat(8)}`);
  });

  it.each([
    { owner_scope: "short", checksum: "ab".repeat(32), purpose: "project" },
    {
      owner_scope: "cd".repeat(8),
      checksum: "not-a-checksum",
      purpose: "project",
    },
    {
      owner_scope: "cd".repeat(8),
      checksum: "ab".repeat(32),
      purpose: "project",
      version: 0,
    },
    {
      owner_scope: "cd".repeat(8),
      checksum: "ab".repeat(32),
      purpose: "../project",
    },
    {
      owner_scope: "cd".repeat(8),
      checksum: "ab".repeat(32),
      purpose: "project",
      ingestion_scope: "not-a-scope",
    },
  ])("rejects invalid immutable-key input %#", (input) => {
    expect(() =>
      buildImmutableStorageKey(
        input as Parameters<typeof buildImmutableStorageKey>[0]
      )
    ).toThrow(AppError);
  });
});

describe("managed-media provider URL allowlist", () => {
  it("accepts canonical Cloudinary and GCP URLs", () => {
    expect(
      assertAllowedProviderUrl({
        provider: "cloudinary",
        cloud_name: "portfolio-cloud",
        url: "https://res.cloudinary.com/portfolio-cloud/image/upload/v1/project/asset.webp",
      }).hostname
    ).toBe("res.cloudinary.com");

    expect(
      assertAllowedProviderUrl({
        provider: "gcs",
        bucket: "portfolio-media",
        url: "https://storage.googleapis.com/portfolio-media/v1/project/asset.webp",
      }).pathname
    ).toBe("/portfolio-media/v1/project/asset.webp");
  });

  it("allows a signed query only for an explicitly private-delivery check", () => {
    const parsed = assertAllowedProviderUrl({
      provider: "gcs",
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com/portfolio-media/v1/resume/file.pdf?X-Goog-Signature=redacted",
      allow_search: true,
    });

    expect(parsed.searchParams.has("X-Goog-Signature")).toBe(true);
  });

  it.each([
    {
      provider: "cloudinary" as const,
      cloud_name: "portfolio-cloud",
      url: "http://res.cloudinary.com/portfolio-cloud/image/upload/asset.webp",
    },
    {
      provider: "cloudinary" as const,
      cloud_name: "portfolio-cloud",
      url: "https://res.cloudinary.com.evil.test/portfolio-cloud/asset.webp",
    },
    {
      provider: "cloudinary" as const,
      cloud_name: "another-cloud",
      url: "https://res.cloudinary.com/portfolio-cloud/image/upload/asset.webp",
    },
    {
      provider: "cloudinary" as const,
      cloud_name: "portfolio-cloud",
      url: "https://user:secret@res.cloudinary.com/portfolio-cloud/asset.webp",
    },
    {
      provider: "gcs" as const,
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com:444/portfolio-media/asset.webp",
    },
    {
      provider: "gcs" as const,
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com/other-bucket/asset.webp",
    },
    {
      provider: "gcs" as const,
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com/portfolio-media/%2e%2e/secret",
    },
    {
      provider: "gcs" as const,
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com/portfolio-media/safe%5c..%5csecret",
    },
    {
      provider: "gcs" as const,
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com/portfolio-media/asset.webp#fragment",
    },
    {
      provider: "gcs" as const,
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com/portfolio-media/asset.webp?X-Goog-Signature=secret",
    },
    {
      provider: "gcs" as const,
      bucket: "portfolio-media",
      url: "https://storage.googleapis.com/portfolio-media/%E0%A4%A",
    },
  ])("rejects unsafe or cross-account URL %#", (input) => {
    expect(() => assertAllowedProviderUrl(input)).toThrow(AppError);
  });
});

describe("managed-media attachment, lifecycle, and delivery policy", () => {
  it("keeps purpose compatibility explicit and strict", () => {
    expect(isMediaPurposeCompatible("project", ["project"])).toBe(true);
    expect(isMediaPurposeCompatible("project", ["article", "hero"])).toBe(
      false
    );
    expect(isMediaPurposeCompatible(undefined, ["generic"])).toBe(false);
  });

  it("allows attachment only for a ready, active, compatible record", () => {
    expect(
      isAttachableMediaRecord({
        lifecycle_state: "ready",
        is_deleted: false,
        purpose: "article",
        expected_purposes: ["article"],
      })
    ).toBe(true);

    for (const input of [
      {
        lifecycle_state: "uploading" as const,
        purpose: "article" as const,
        expected_purposes: ["article" as const],
      },
      {
        lifecycle_state: "error" as const,
        purpose: "article" as const,
        expected_purposes: ["article" as const],
      },
      {
        lifecycle_state: "ready" as const,
        is_deleted: true,
        purpose: "article" as const,
        expected_purposes: ["article" as const],
      },
      {
        lifecycle_state: "ready" as const,
        purpose: "project" as const,
        expected_purposes: ["article" as const],
      },
    ]) {
      expect(isAttachableMediaRecord(input)).toBe(false);
    }
  });

  it("allows only the declared lifecycle transitions", () => {
    const states: TFileLifecycleState[] = [
      "uploading",
      "ready",
      "orphaned",
      "deleting",
      "error",
    ];
    const permitted = new Set([
      "uploading:uploading",
      "uploading:ready",
      "uploading:orphaned",
      "uploading:error",
      "ready:ready",
      "ready:deleting",
      "orphaned:orphaned",
      "orphaned:deleting",
      "orphaned:error",
      "deleting:deleting",
      "deleting:error",
      "error:error",
      "error:deleting",
    ]);

    for (const from of states) {
      for (const to of states) {
        expect(canTransitionMediaLifecycle(from, to), `${from} -> ${to}`).toBe(
          permitted.has(`${from}:${to}`)
        );
      }
    }
  });

  it("fails closed instead of throwing for an invalid persisted lifecycle", () => {
    expect(
      canTransitionMediaLifecycle("unknown" as TFileLifecycleState, "ready")
    ).toBe(false);
    expect(
      canTransitionMediaLifecycle("ready", "unknown" as TFileLifecycleState)
    ).toBe(false);
  });

  it.each([
    [Number.NaN, 300],
    [Number.POSITIVE_INFINITY, 300],
    [-100, 30],
    [30, 30],
    [301.9, 301],
    [900, 900],
    [10_000, 900],
  ])("clamps private delivery TTL %s to %s seconds", (input, expected) => {
    expect(clampPrivateDeliveryTtl(input)).toBe(expected);
  });

  it("maps storage operations to stable, non-secret error codes", () => {
    expect(getSafeStorageErrorCode("upload")).toBe("STORAGE_UPLOAD_FAILED");
    expect(getSafeStorageErrorCode("delete")).toBe("STORAGE_DELETE_FAILED");
    expect(getSafeStorageErrorCode("delivery")).toBe("STORAGE_DELIVERY_FAILED");
  });

  it("does not admit an unvalidated purpose into compatibility at runtime", () => {
    expect(
      isMediaPurposeCompatible("generic", ["../generic" as TFilePurpose])
    ).toBe(false);
  });
});
