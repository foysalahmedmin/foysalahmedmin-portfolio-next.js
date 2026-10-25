import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The server-rendered poster is the hero's LCP element on every tier, so its weight is a contract:
 * at most 60 KB for the portrait (phone) frame and 120 KB for the landscape one (docs plan 6.2).
 */
const DIRECTORY = join(process.cwd(), "public/images/hero");
const BUDGET_KB = { portrait: 60, landscape: 120 } as const;

describe("hero poster assets", () => {
  for (const theme of ["dark", "light"] as const) {
    for (const frame of ["landscape", "portrait"] as const) {
      for (const format of ["avif", "webp"] as const) {
        const name = `maquette-${theme}-${frame}.${format}`;
        it(`${name} exists and is within budget`, () => {
          const file = join(DIRECTORY, name);
          expect(existsSync(file)).toBe(true);
          expect(statSync(file).size / 1024).toBeLessThanOrEqual(
            BUDGET_KB[frame]
          );
        });
      }
    }
  }

  it("keeps the role hero art next to the poster, named after the three roles", () => {
    for (const role of [
      "system-architect",
      "software-developer",
      "ai-automation",
    ]) {
      expect(existsSync(join(DIRECTORY, `${role}.master.png`)), role).toBe(
        true
      );
    }
  });
});
