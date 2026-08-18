import {
  getFallbackMedia,
  getFallbackMediaPresentation,
  PILLAR_KEYS,
} from "@/lib/content/fallback-media";
import { describe, expect, it } from "vitest";

describe("emergency media resolver", () => {
  it("returns the generated public hero preview for each pillar", () => {
    expect(getFallbackMedia("hero", "frontend")).toBe(
      "/images/heroes/frontend.master.png"
    );
    expect(getFallbackMedia("hero", "system_design")).toBe(
      "/images/heroes/system-design-pilot.master.png"
    );
    expect(getFallbackMedia("hero", "devops_cloud")).toBe(
      "/images/heroes/devops-cloud.master.png"
    );
    expect(getFallbackMedia("hero", PILLAR_KEYS[0])).not.toBe(
      getFallbackMedia("hero", PILLAR_KEYS[4])
    );

    // Every pillar must resolve to its own hero file, never the generic
    // fallback and never a path borrowed from another pillar.
    const heroes = PILLAR_KEYS.map((key) => getFallbackMedia("hero", key));
    expect(new Set(heroes).size).toBe(PILLAR_KEYS.length);
    for (const src of heroes) {
      expect(src.startsWith("/images/heroes/")).toBe(true);
    }

    const presentation = getFallbackMediaPresentation("hero", "frontend");
    expect(presentation).toMatchObject({
      focal_point: { x: 0.72, y: 0.5 },
      dominant_color: "#e8d8c8",
    });
    expect(presentation.blur_data_url).toMatch(/^data:image\/webp;base64,/);
  });

  it.each(["project", "article", "profile"] as const)(
    "returns a deterministic %s SVG fallback",
    (kind) => {
      const first = getFallbackMedia(kind, PILLAR_KEYS[0]);
      expect(first).toMatch(/^\/images\/fallback-[a-z-]+\.svg$/);
      expect(getFallbackMedia(kind, PILLAR_KEYS[4])).toBe(first);
    }
  );

  it("keeps the legacy hero SVG available when no pillar is supplied", () => {
    expect(getFallbackMedia("hero")).toBe("/images/fallback-hero.svg");
  });
});
