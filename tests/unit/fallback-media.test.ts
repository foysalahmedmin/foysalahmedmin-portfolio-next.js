import {
  getFallbackMedia,
  getFallbackMediaPresentation,
  PILLAR_KEYS,
} from "@/lib/content/fallback-media";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("emergency media resolver", () => {
  it("returns the generated public hero preview for each pillar", () => {
    expect(getFallbackMedia("hero", "system_architect")).toBe(
      "/images/hero/system-architect.master.png"
    );
    expect(getFallbackMedia("hero", "software_developer")).toBe(
      "/images/hero/software-developer.master.png"
    );
    expect(getFallbackMedia("hero", "ai_automation")).toBe(
      "/images/hero/ai-automation.master.png"
    );

    // Every pillar must resolve to its own hero file, never the generic
    // fallback and never a path borrowed from another pillar.
    const heroes = PILLAR_KEYS.map((key) => getFallbackMedia("hero", key));
    expect(new Set(heroes).size).toBe(PILLAR_KEYS.length);
    for (const src of heroes) {
      expect(src.startsWith("/images/hero/")).toBe(true);
    }

    const presentation = getFallbackMediaPresentation(
      "hero",
      "software_developer"
    );
    expect(presentation).toMatchObject({
      focal_point: { x: 0.72, y: 0.5 },
      dominant_color: "#e8e8e8",
    });
    expect(presentation.blur_data_url).toMatch(/^data:image\/webp;base64,/);
  });

  it("only points at hero files that exist in the public directory", () => {
    for (const key of PILLAR_KEYS) {
      const src = getFallbackMedia("hero", key);
      expect(fs.existsSync(path.resolve("public", src.slice(1)))).toBe(true);
    }
  });

  it.each(["article", "profile"] as const)(
    "returns a deterministic %s SVG fallback",
    (kind) => {
      const first = getFallbackMedia(kind, PILLAR_KEYS[0]);
      expect(first).toMatch(/^\/images\/fallback-[a-z-]+\.svg$/);
      expect(getFallbackMedia(kind, PILLAR_KEYS[PILLAR_KEYS.length - 1])).toBe(
        first
      );
    }
  );

  it("gives a project the drawing of its role, one frame for all three, and a default without one", () => {
    const art = PILLAR_KEYS.map((key) => getFallbackMedia("project", key));
    expect(new Set(art).size).toBe(PILLAR_KEYS.length);
    for (const src of [...art, getFallbackMedia("project")]) {
      expect(src).toMatch(
        /^\/images\/(fallback\/project-[a-z-]+|fallback-project)\.svg$/
      );
      expect(fs.existsSync(path.resolve("public", src.slice(1)))).toBe(true);
    }
    for (const src of art) {
      // One shared frame: 4:3 on a dark grid, no colour
      const svg = fs.readFileSync(path.resolve("public", src.slice(1)), "utf8");
      expect(svg).toContain('viewBox="0 0 1200 900"');
      const colours = [...svg.matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)].map(
        (match) => match[1]!
      );
      expect(colours.length).toBeGreaterThan(0);
      for (const colour of colours) {
        const hex =
          colour.length === 3 ? [...colour].map((c) => c + c).join("") : colour;
        expect(hex.slice(0, 2), `${src} ${colour}`).toBe(hex.slice(2, 4));
        expect(hex.slice(2, 4), `${src} ${colour}`).toBe(hex.slice(4, 6));
      }
    }
  });

  it("keeps the legacy hero SVG available when no pillar is supplied", () => {
    expect(getFallbackMedia("hero")).toBe("/images/fallback-hero.svg");
  });
});
