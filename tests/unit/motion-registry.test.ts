import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LAB_DEMO_IDS } from "@/lib/motion/lab";
import {
  CONSOLE_EFFECTS,
  MOTION_REGISTRY,
  PUBLIC_EFFECTS,
} from "@/lib/motion/registry";
import {
  REGISTRY_END,
  REGISTRY_START,
  registryMarkdown,
} from "@/lib/motion/registry-doc";
import { dur, ease } from "@/lib/motion/tokens";
import { describe, expect, it } from "vitest";

const MEANINGS = ["transmit", "resolve", "assemble", "respond"];
const SUPPORT = ["run", "css", "none"];

/** Prettier pads Markdown tables; compare cell contents, not whitespace. */
const normaliseTable = (text: string) =>
  text
    .trim()
    .split("\n")
    .map((line) =>
      line
        .split("|")
        .map((cell) => cell.trim().replace(/^-+$/, "---"))
        .join("|")
    )
    .join("\n");

describe("motion effect registry (docs plan Appendix A)", () => {
  it("declares 39 public and 7 console effects with contiguous ids", () => {
    expect(PUBLIC_EFFECTS.map((effect) => effect.id)).toEqual(
      Array.from({ length: 39 }, (_, i) => `M${String(i + 1).padStart(2, "0")}`)
    );
    expect(CONSOLE_EFFECTS.map((effect) => effect.id)).toEqual(
      Array.from({ length: 7 }, (_, i) => `C${String(i + 1).padStart(2, "0")}`)
    );
    expect(new Set(MOTION_REGISTRY.map((effect) => effect.id)).size).toBe(46);
  });

  it.each(MOTION_REGISTRY.map((effect) => [effect.id, effect] as const))(
    "%s declares trigger, timing, a reduced variant and valid tokens",
    (_id, effect) => {
      expect(effect.name.trim()).not.toBe("");
      expect(effect.trigger.trim()).not.toBe("");
      expect(effect.timing.trim()).not.toBe("");
      expect(effect.reduced.trim()).not.toBe("");
      expect(Number.isInteger(effect.phase)).toBe(true);
      for (const token of effect.durations) expect(dur).toHaveProperty(token);
      for (const token of effect.eases) expect(ease).toHaveProperty(token);

      if (effect.surface === "public") {
        expect(MEANINGS).toContain(effect.meaning);
        expect(effect.tiers).toBeDefined();
        for (const value of Object.values(effect.tiers!)) {
          expect(SUPPORT).toContain(value);
        }
      } else {
        // The console is CSS only: no tiers, no meaning of its own
        expect(effect.tiers).toBeUndefined();
      }
    }
  );

  it("uses all four meanings", () => {
    const used = new Set(PUBLIC_EFFECTS.map((effect) => effect.meaning));
    for (const meaning of MEANINGS) expect(used).toContain(meaning);
  });

  it("every built effect names a file that exists", () => {
    const built = MOTION_REGISTRY.filter((effect) => effect.built);
    expect(built.length).toBeGreaterThan(0);
    for (const effect of built) {
      expect(effect.implementation, effect.id).toBeTruthy();
      expect(
        existsSync(join(process.cwd(), effect.implementation!)),
        `${effect.id}: ${effect.implementation}`
      ).toBe(true);
    }
  });

  it("every built public effect is demonstrated: in the Motion lab, or on the real page it lives in", () => {
    const built = PUBLIC_EFFECTS.filter((effect) => effect.built);
    const inLab = built
      .filter((effect) => !effect.demoRoute)
      .map((effect) => effect.id);
    expect([...LAB_DEMO_IDS].sort()).toEqual([...inLab].sort());

    const page = readFileSync(
      join(process.cwd(), "src/app/(lab)/lab/motion/page.tsx"),
      "utf8"
    );
    for (const id of LAB_DEMO_IDS) {
      expect(page, id).toContain(`effectId="${id}"`);
    }
    for (const effect of built.filter((entry) => entry.demoRoute)) {
      expect(effect.demoRoute, effect.id).toMatch(/^\//);
    }
  });

  it("the motion documentation tables are the registry (regenerate with scripts/motion-registry-doc.ts --write)", () => {
    const doc = readFileSync(
      join(process.cwd(), "docs/design-system/motion.md"),
      "utf8"
    );
    const start = doc.indexOf(REGISTRY_START);
    const end = doc.indexOf(REGISTRY_END);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(normaliseTable(doc.slice(start + REGISTRY_START.length, end))).toBe(
      normaliseTable(registryMarkdown())
    );
  });
});
