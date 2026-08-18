import { describe, expect, it } from "vitest";
import {
  isRepeatableContentIndexReady,
  REPEATABLE_CONTENT_INDEX_TARGETS,
} from "@/lib/db/migrations/202607150012-repeatable-content-foundation";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";

type RepeatableIndexTarget = (typeof REPEATABLE_CONTENT_INDEX_TARGETS)[number];

const isTextIndexTarget = (
  target: RepeatableIndexTarget | undefined
): target is RepeatableIndexTarget & {
  options: RepeatableIndexTarget["options"] & {
    weights: Record<string, number>;
    default_language: string;
  };
} =>
  Boolean(
    target &&
      "weights" in target.options &&
      target.options.weights &&
      "default_language" in target.options &&
      typeof target.options.default_language === "string"
  );

describe("repeatable-content foundation migration", () => {
  it("is registered after Site and contact operations", () => {
    const ids = MIGRATION_REGISTRY.map(({ id }) => id);
    const id = "202607150012-repeatable-content-foundation";
    expect(ids).toContain(id);
    expect(ids.indexOf(id)).toBeGreaterThan(
      ids.indexOf("202607150011-contact-inbox-operations")
    );
  });

  it("declares every domain, trust query, and durable cache index", () => {
    const collections = new Set(
      REPEATABLE_CONTENT_INDEX_TARGETS.map(({ collection }) => collection)
    );
    expect(collections).toEqual(
      new Set([
        "services",
        "skill_groups",
        "skills",
        "timeline_entries",
        "credentials",
        "faqs",
        "testimonials",
        "legal_documents",
        "repeatable_cache_invalidations",
      ])
    );
    const names = REPEATABLE_CONTENT_INDEX_TARGETS.map(
      ({ options }) => options.name
    );
    expect(names).toContain("testimonial_public_trust_sequence");
    expect(names).toContain("legal_document_active_type_version_unique");
    expect(names).toContain("repeatable_cache_delivered_ttl");
    expect(new Set(names).size).toBe(names.length);
  });

  it("does not accept a same-name unique index with weaker options", () => {
    const target = REPEATABLE_CONTENT_INDEX_TARGETS.find(
      ({ options }) => options.name === "service_active_locale_slug_unique"
    )!;
    expect(
      isRepeatableContentIndexReady(
        {
          name: target.options.name,
          key: target.key,
          unique: true,
          partialFilterExpression: { is_deleted: false },
        },
        target
      )
    ).toBe(true);
    expect(
      isRepeatableContentIndexReady(
        { name: target.options.name, key: target.key },
        target
      )
    ).toBe(false);
  });

  it("accepts a text index in the shape MongoDB actually reports", () => {
    const target = REPEATABLE_CONTENT_INDEX_TARGETS.find(
      ({ options }) => options.name === "service_search_text"
    );
    if (!isTextIndexTarget(target))
      throw new Error("Text index target missing");

    // listIndexes never echoes { search_text: "text" }; a text index is always
    // reported with the internal full-text key and the field list in weights.
    expect(
      isRepeatableContentIndexReady(
        {
          name: target.options.name,
          key: { _fts: "text", _ftsx: 1 },
          weights: target.options.weights,
          default_language: target.options.default_language,
        },
        target
      )
    ).toBe(true);
  });

  it("rejects text indexes that omit the code-owned language behavior", () => {
    const target = REPEATABLE_CONTENT_INDEX_TARGETS.find(
      ({ options }) => options.name === "service_search_text"
    );
    expect(isTextIndexTarget(target)).toBe(true);
    if (!isTextIndexTarget(target))
      throw new Error("Text index target missing");
    expect(target.key).toEqual({ search_text: "text" });
    expect(
      isRepeatableContentIndexReady(
        {
          name: target.options.name,
          key: { _fts: "text", _ftsx: 1 },
          weights: target.options.weights,
          default_language: target.options.default_language,
        },
        target
      )
    ).toBe(true);
    expect(
      isRepeatableContentIndexReady(
        {
          name: target.options.name,
          key: { _fts: "text", _ftsx: 1 },
          weights: target.options.weights,
        },
        target
      )
    ).toBe(false);
  });
});
