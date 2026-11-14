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

/**
 * Martian Mono's advance per character at each width step (em, measured in the browser, the same at every
 * weight), divided by the 0.602 em of the system monospaces the fallbacks use.
 */
const MONO_ADVANCE: Record<string, number> = {
  "75": 0.6,
  "90": 0.66,
  "100": 0.7,
};
const SYSTEM_MONO_ADVANCE = 0.6021;

describe("mono font fallbacks", () => {
  it.each(Object.entries(MONO_ADVANCE))(
    "wdth %s has a face scaled to the real advance",
    (step, advance) => {
      const block = faces.find((face) =>
        face.includes(`"Martian Mono Fallback ${step}"`)
      );
      expect(block, `mono fallback ${step}`).toBeDefined();
      const adjust = block!.match(/size-adjust:\s*([\d.]+)%/);
      expect(Number(adjust![1])).toBeCloseTo(
        (advance / SYSTEM_MONO_ADVANCE) * 100,
        0
      );
      // Only monospaces whose advance is 0.600 to 0.602 em may stand in
      expect(block).not.toMatch(/local\("(Arial|Helvetica|Consolas)/);
    }
  );

  it("puts each calibrated mono fallback right after the real face in its stack", () => {
    for (const step of Object.keys(MONO_ADVANCE)) {
      const token = step === "100" ? "--ff-mono" : `--ff-mono-${step}`;
      expect(tokens).toMatch(
        new RegExp(
          `${token}:\\s*var\\(--font-mono-face\\), "Martian Mono Fallback ${step}"`
        )
      );
    }
  });

  it("sets the narrow labels and the metric in the stack that matches their stretch", () => {
    expect(type).toMatch(/\.t-eyebrow\s*\{[^}]*--ff-mono-75/);
    expect(type).toMatch(/\.type-label\s*\{[^}]*--ff-mono-75/);
    expect(type).toMatch(/\.type-metric\s*\{[^}]*--ff-mono-90/);
  });

  it("leaves no generic mono family on a rule that sets a narrow stretch", () => {
    for (const file of [
      "src/assets/styles/public/type.css",
      "src/assets/styles/public/pages-editorial.css",
      "src/assets/styles/public/pages-lab.css",
    ]) {
      const css = stripComments(readRepoFile(file));
      const blocks = [
        ...css.matchAll(/\{([^{}]*font-stretch:\s*75%[^{}]*)\}/g),
      ];
      expect(blocks.length, file).toBeGreaterThan(0);
      for (const [, body] of blocks) {
        if (/--ff-mono/.test(body!)) {
          expect(body, file).toMatch(/--ff-mono-75/);
        }
      }
    }
  });
});
