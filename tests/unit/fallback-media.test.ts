import { getFallbackMedia, PILLAR_KEYS } from "@/lib/content/fallback-media";
import { describe, expect, it } from "vitest";

describe("emergency media resolver", () => {
  it.each(["hero", "project", "article", "profile"] as const)(
    "returns a deterministic %s fallback",
    (kind) => {
      const first = getFallbackMedia(kind, PILLAR_KEYS[0]);
      expect(first).toMatch(/^\/images\/fallback-[a-z-]+\.svg$/);
      expect(getFallbackMedia(kind, PILLAR_KEYS[4])).toBe(first);
    }
  );
});
