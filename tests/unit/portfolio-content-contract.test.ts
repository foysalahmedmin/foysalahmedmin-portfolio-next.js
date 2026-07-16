import { toPublicProjectDto } from "@/app/api/public-content.dto";
import { Project } from "@/app/api/projects/project.model";
import { Article } from "@/app/api/articles/article.model";
import {
  PILLAR_CONTRACT,
  PILLAR_CONTRACT_VERSION,
  PILLAR_KEYS,
  normalizePillarRelationships,
  pillarKeySchema,
} from "@/lib/content/pillars";
import {
  deriveArticleBodyMetadata,
  deriveReadingTimeMinutes,
  getProjectPublishReadiness,
  getArticlePublishReadiness,
  isAllowedPublicProjectUrl,
} from "@/lib/content/portfolio-contract";
import {
  appendSlugSuffix,
  canonicalSlugSchema,
  normalizeSlug,
  normalizeSlugIdentifier,
} from "@/lib/content/slug";
import {
  CONTENT_SLUG_INDEX_TARGETS,
  CONTENT_SLUG_TARGETS,
  isContentSlugIndexReady,
} from "@/lib/db/migrations/202607150006-content-slug-foundation";
import {
  deriveArticleContractMetadata,
  deriveLegacyDeliveryStatus,
} from "@/lib/db/migrations/202607150007-portfolio-content-contract";
import { describe, expect, it } from "vitest";
import { Types } from "mongoose";

describe("canonical portfolio contracts", () => {
  it("owns exactly the ordered five stable pillar keys", () => {
    expect(PILLAR_CONTRACT_VERSION).toBe(1);
    expect(PILLAR_KEYS).toEqual([
      "frontend",
      "backend",
      "ai_automation",
      "system_design",
      "full_stack",
    ]);
    expect(PILLAR_CONTRACT.map(({ key }) => key)).toEqual(PILLAR_KEYS);
    expect(new Set(PILLAR_KEYS).size).toBe(5);
    expect(pillarKeySchema.safeParse("mobile").success).toBe(false);
  });

  it("deduplicates secondary pillars and excludes the primary pillar", () => {
    expect(
      normalizePillarRelationships("backend", [
        "backend",
        "frontend",
        "frontend",
        "system_design",
      ])
    ).toEqual(["frontend", "system_design"]);
  });

  it("normalizes human slugs and preserves deterministic suffixes", () => {
    expect(normalizeSlug("  Déjà Vu & APIs  ")).toBe("deja-vu-and-apis");
    expect(normalizeSlug("বাংলা", { fallback: "article" })).toBe("article");
    expect(appendSlugSuffix("a".repeat(96), "abcdef12")).toHaveLength(96);
    expect(canonicalSlugSchema.safeParse("Not Canonical").success).toBe(false);
    expect(normalizeSlugIdentifier("!!!")).toBeNull();
  });

  it("allows only public HTTPS project links", () => {
    expect(isAllowedPublicProjectUrl("https://example.com/work")).toBe(true);
    expect(isAllowedPublicProjectUrl("http://example.com/work")).toBe(false);
    expect(isAllowedPublicProjectUrl("https://localhost/work")).toBe(false);
    expect(isAllowedPublicProjectUrl("https://192.168.1.10/work")).toBe(false);
    expect(isAllowedPublicProjectUrl("https://user:pass@example.com")).toBe(
      false
    );
  });

  it("enforces canonical slugs and URL policy at the model boundary", async () => {
    const project = new Project({
      name: "Secure platform",
      slug: "Not Canonical",
      content: "Safe content",
      category: new Types.ObjectId(),
      author: new Types.ObjectId(),
      live_url: "http://127.0.0.1/internal",
    });
    await expect(project.validate()).rejects.toThrow();

    const article = new Article({
      name: "Canonical article",
      slug: "canonical-article",
      content: "Safe content",
      category: new Types.ObjectId(),
      author: new Types.ObjectId(),
    });
    await expect(article.validate()).resolves.toBeUndefined();
  });

  it("derives article metadata without trusting markup as words", () => {
    const metadata = deriveArticleBodyMetadata(
      "<h2>Secure APIs</h2><p>Fast and reliable.</p>"
    );
    expect(metadata).toEqual({
      schema_version: 1,
      word_count: 5,
      heading_count: 1,
    });
    expect(deriveReadingTimeMinutes(226)).toBe(2);
    expect(deriveArticleContractMetadata("<p>one two</p>")).toMatchObject({
      body_metadata: { word_count: 2 },
      reading_time_minutes: 1,
    });
  });

  it("reports missing case-study evidence instead of fabricating it", () => {
    expect(getProjectPublishReadiness({})).toEqual([
      "primary_pillar",
      "project_type",
      "problem",
      "role",
      "architecture",
      "implementation",
      "security",
      "performance_reliability",
      "constraints",
      "decisions",
      "learnings",
      "outcomes",
    ]);
    expect(
      getProjectPublishReadiness({
        outcomes: [
          {
            label: "Claim",
            value: "2x",
            verification_state: "unverified",
          },
        ],
      })
    ).toContain("outcomes");
  });

  it("stages article publish requirements without inventing editorial fields", () => {
    expect(getArticlePublishReadiness({})).toEqual([
      "excerpt",
      "primary_pillar",
    ]);
    expect(
      getArticlePublishReadiness({
        excerpt: "A concise, human-authored summary.",
        primary_pillar: "backend",
      })
    ).toEqual([]);
  });

  it("redacts private links, evidence references, and unverified outcomes", () => {
    const dto = toPublicProjectDto({
      slug: "secure-platform",
      role: "  Lead engineer\u0000\n and systems architect  ",
      publication_status: "published",
      slug_history: [{ slug: "old" }],
      live_url: "https://private.example.com",
      live_url_visibility: "private",
      source_url: "https://github.com/example/repo",
      source_url_visibility: "public",
      outcomes: [
        {
          label: "Latency",
          value: "20%",
          verification_state: "verified",
          evidence_reference: "private-report",
        },
        {
          label: "Revenue",
          value: "2x",
          verification_state: "unverified",
        },
      ],
    });
    expect(dto).not.toHaveProperty("publication_status");
    expect(dto).not.toHaveProperty("slug_history");
    expect(dto).not.toHaveProperty("live_url");
    expect(dto.role).toBe("Lead engineer and systems architect");
    expect(dto.source_url).toBe("https://github.com/example/repo");
    expect(dto.outcomes).toEqual([
      { label: "Latency", value: "20%", verification_state: "verified" },
    ]);
  });

  it("declares all slug scopes and collision-safe unique indexes", () => {
    expect(CONTENT_SLUG_TARGETS.map(({ scope }) => scope)).toEqual([
      "project",
      "article",
      "project_category",
      "article_category",
    ]);
    expect(
      CONTENT_SLUG_INDEX_TARGETS.filter(
        (target) => "unique" in target.options && target.options.unique
      ).map((target) => target.options.name)
    ).toEqual([
      "unique_project_slug_active",
      "unique_article_slug_active",
      "unique_content_slug_alias",
    ]);
    const aliasIndex = CONTENT_SLUG_INDEX_TARGETS.find(
      (target) => target.options.name === "unique_content_slug_alias"
    )!;
    expect(
      isContentSlugIndexReady(
        {
          name: "unique_content_slug_alias",
          key: { scope: 1, slug: 1 },
        },
        aliasIndex
      )
    ).toBe(false);
    expect(
      isContentSlugIndexReady(
        {
          name: "unique_content_slug_alias",
          key: { scope: 1, slug: 1 },
          unique: true,
        },
        aliasIndex
      )
    ).toBe(true);
  });

  it("maps only meaningful legacy delivery states", () => {
    expect(deriveLegacyDeliveryStatus("planned")).toBe("planned");
    expect(deriveLegacyDeliveryStatus("on_hold")).toBe("active");
    expect(deriveLegacyDeliveryStatus("completed")).toBe("completed");
    expect(deriveLegacyDeliveryStatus("cancelled")).toBeNull();
  });
});
