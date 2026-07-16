import {
  mergeListQueryString,
  normalizeListQueryState,
  parseListQueryState,
} from "@/utils/query-state";
import { describe, expect, it } from "vitest";

describe("list query-state helpers", () => {
  it("parses and normalizes supported URL state", () => {
    expect(
      parseListQueryState("?search=%20systems%20&category=backend&page=3")
    ).toEqual({
      search: "systems",
      category: "backend",
      page: 3,
    });
  });

  it("falls back for invalid pages and caps extreme pages", () => {
    expect(parseListQueryState("?page[$gt]=1&page=1.5").page).toBe(1);
    expect(parseListQueryState("?page=999999999").page).toBe(1_000_000);
  });

  it("merges managed state while preserving unrelated query parameters", () => {
    expect(
      mergeListQueryString("?utm_source=profile&page=5", {
        search: "design systems",
        category: "all",
        page: 1,
      })
    ).toBe("?utm_source=profile&search=design+systems");
  });

  it("removes defaults and normalizes state before serializing", () => {
    const state = normalizeListQueryState({
      search: "  ",
      category: "",
      page: -2,
    });

    expect(state).toEqual({ search: "", category: "all", page: 1 });
    expect(mergeListQueryString("?search=old&category=old&page=2", state)).toBe(
      ""
    );
  });

  it("preserves a trailing space while typing but trims the shared URL", () => {
    const state = normalizeListQueryState({ search: "design ", page: 1 });

    expect(state.search).toBe("design ");
    expect(mergeListQueryString("", state)).toBe("?search=design");
  });
});
