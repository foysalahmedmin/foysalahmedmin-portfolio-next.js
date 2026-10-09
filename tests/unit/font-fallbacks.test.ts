import { describe, expect, it } from "vitest";
import { readRepoFile, stripComments } from "../helpers/contrast";

/**
 * Archivo's width axis is what makes the display type distinctive and what makes a font swap shift
 * the page. The fallback faces in fonts.css are calibrated to measured widths; this keeps the tokens,
 * the faces and the type classes in step so a rename cannot silently drop the calibration.
 */
const fonts = stripComments(readRepoFile("src/assets/styles/public/fonts.css"));
const faces = [...fonts.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(
  (match) => match[1]!
);
const tokens = stripComments(
  readRepoFile("src/assets/styles/public/tokens.css")
);
const type = stripComments(readRepoFile("src/assets/styles/public/type.css"));

// Measured against Arial Bold at the same size (means over eight headlines, Phase 1)
const MEASURED: Record<string, number> = {
  "125": 128.2,
  "118": 119.2,
  "112": 110.9,
  "100": 95.2,
};

describe("display font fallbacks", () => {
  it.each(Object.entries(MEASURED))(
    "wdth %s has a face scaled to the measured width",
    (step, percent) => {
      // Declaration order is not stable (the repo's prettier plugin sorts properties), so read per block
      const block = faces.find((face) =>
        face.includes(`"Archivo Fallback ${step}"`)
      );
      expect(block, `fallback face ${step}`).toBeDefined();
      const adjust = block!.match(/size-adjust:\s*([\d.]+)%/);
      expect(Number(adjust![1])).toBeCloseTo(percent, 1);
    }
  );

  it("puts each calibrated fallback right after the display face in its stack", () => {
    for (const step of Object.keys(MEASURED)) {
      expect(tokens).toContain(`--ff-display-${step}:`);
      expect(tokens).toMatch(
        new RegExp(
          `--ff-display-${step}:\\s*var\\(--font-display-face\\), "Archivo Fallback ${step}"`
        )
      );
    }
  });

  it("uses a calibrated stack for every display class", () => {
    for (const className of [
      ".t-h1",
      ".t-h2",
      ".t-h3",
      ".t-h4",
      ".type-display",
      ".type-heading-1",
      ".type-heading-2",
      ".type-heading-3",
    ]) {
      const block = type.match(
        new RegExp(`${className.replace(".", "\\.")}\\s*\\{[^}]*\\}`)
      );
      expect(block?.[0], className).toMatch(/--ff-display-(125|118|112|100)/);
    }
  });
});
