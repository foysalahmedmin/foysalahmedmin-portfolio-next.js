import {
  combineQueryFilters,
  normalizePositiveInteger,
  parseQueryBoolean,
  sanitizeQueryParams,
} from "@/builder/app-query";
import { describe, expect, it } from "vitest";

describe("AppQuery helpers", () => {
  it("composes caller filters without allowing query parameters to override them", () => {
    expect(
      combineQueryFilters(
        { author: "authenticated-user", status: "active" },
        { author: "other-user" }
      )
    ).toEqual({
      $and: [
        { author: "authenticated-user", status: "active" },
        { author: "other-user" },
      ],
    });

    expect(
      combineQueryFilters(
        { $or: [{ expired_at: null }, { expired_at: { $gt: "now" } }] },
        { $or: [{ name: /search/i }, { description: /search/i }] }
      )
    ).toEqual({
      $and: [
        { $or: [{ expired_at: null }, { expired_at: { $gt: "now" } }] },
        { $or: [{ name: /search/i }, { description: /search/i }] },
      ],
    });
  });

  it("parses count-only booleans without treating the string false as true", () => {
    expect(parseQueryBoolean(true)).toBe(true);
    expect(parseQueryBoolean(" TRUE ")).toBe(true);
    expect(parseQueryBoolean("1")).toBe(true);
    expect(parseQueryBoolean(false)).toBe(false);
    expect(parseQueryBoolean("false")).toBe(false);
    expect(parseQueryBoolean("0")).toBe(false);
    expect(parseQueryBoolean({ $ne: false })).toBe(false);
  });

  it("rejects object values and operator-shaped query keys", () => {
    const input = JSON.parse(
      '{"status":"published","is_featured":false,"category":{"$ne":null},"$where":"danger","status[$ne]":"draft","metadata.file_type":"image","__proto__":"unsafe"}'
    ) as Record<string, unknown>;

    expect(() => sanitizeQueryParams(input)).toThrow(
      "Invalid query parameters"
    );
  });

  it("preserves safe primitive query values", () => {
    expect(
      sanitizeQueryParams({
        status: "published",
        is_featured: false,
        "metadata.file_type": "image",
        page: "2",
        limit: "500",
        sort: "-created_at,name",
      })
    ).toEqual({
      status: "published",
      is_featured: false,
      "metadata.file_type": "image",
      page: "2",
      limit: "500",
      sort: "-created_at,name",
    });
  });

  it("rejects invalid pagination and control parameters", () => {
    expect(() => sanitizeQueryParams({ page: "1.5" })).toThrow();
    expect(() => sanitizeQueryParams({ limit: "-1" })).toThrow();
    expect(() => sanitizeQueryParams({ is_count_only: "yes" })).toThrow();
    expect(() => sanitizeQueryParams({ deleted_scope: "all" })).toThrow();
    expect(() => sanitizeQueryParams({ sort: "created_at,$where" })).toThrow();
  });

  it("normalizes invalid positive integers and caps large values", () => {
    expect(normalizePositiveInteger("2", 1, 100)).toBe(2);
    expect(normalizePositiveInteger("1.5", 1, 100)).toBe(1);
    expect(normalizePositiveInteger("-4", 10, 100)).toBe(10);
    expect(normalizePositiveInteger("Infinity", 10, 100)).toBe(10);
    expect(normalizePositiveInteger("500", 10, 100)).toBe(100);
    expect(normalizePositiveInteger({ value: 5 }, 10, 100)).toBe(10);
  });
});
