import { readRepoFile, stripComments } from "../helpers/contrast";
import { describe, expect, it } from "vitest";

/**
 * "Never hide the LCP element or primary content before JS" (docs plan 3.7, rule 5), as a property of
 * the stylesheet: nothing in hero.css may fade, offset or clip content unless the selector says the
 * engine has pinned the section. The few exceptions are things that only exist with JavaScript (the
 * canvas and its labels) or that are animations which start from a pose but never from invisibility.
 */
const css = stripComments(readRepoFile("src/assets/styles/public/hero.css"));

type Rule = { selector: string; body: string };
const rules: Rule[] = [];
// Flatten @media blocks; keyframes are checked separately
const flat = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
for (const match of flat.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
  rules.push({ selector: match[1]!.trim(), body: match[2]! });
}

const ALLOWED_INVISIBLE = [
  ".hero-canvas", // the canvas exists only after the scene is created, and starts transparent on purpose
  ".hero-grid", // aria-hidden decoration with no content in it
  ".hero-label", // exists to be positioned by the scene
  ".hero-cue", // aria-hidden decoration, only shown pinned
];

describe("hero.css hides nothing before the engine pins the section", () => {
  it("fades or moves content only under [data-pinned]", () => {
    const offenders = rules.filter(({ selector, body }) => {
      const hides =
        /opacity:\s*(?!1\b)(?!var)/.test(body) ||
        /translateY\(|translate3d\(|skewY\(|visibility:\s*hidden|display:\s*none/.test(
          body
        );
      if (!hides) return false;
      if (selector.includes('[data-pinned="true"]')) return false;
      if (ALLOWED_INVISIBLE.some((allowed) => selector.includes(allowed)))
        return false;
      return true;
    });
    // display: none is how the theme picks a poster and how print drops the decoration
    expect(
      offenders
        .map((rule) => rule.selector)
        .filter(
          (selector) =>
            !/hero-poster--(light|dark)/.test(selector) &&
            !selector.includes(".hero-rolebar") &&
            !selector.includes(".hero-backdrop")
        )
    ).toEqual([]);
  });

  it("no animation starts from invisibility", () => {
    const keyframes = [
      ...css.matchAll(
        /@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g
      ),
    ];
    expect(keyframes.length).toBeGreaterThan(0);
    for (const [, name, body] of keyframes) {
      // the scroll cue fades out by design; every other keyframe set must not touch opacity
      if (name === "hero-cue") continue;
      expect(body, `@keyframes ${name}`).not.toMatch(/opacity/);
    }
  });

  it("the pinned rules read the story clock, not their own timers", () => {
    expect(css).toContain("--pin-position");
    expect(css).toContain("--pin-progress");
    expect(css).not.toMatch(
      /transition-delay|animation-delay:\s*calc\(var\(--pin/
    );
  });

  it("the canvas cross-fades in, and only once the scene has drawn a frame", () => {
    expect(css).toMatch(/\.hero-canvas canvas\s*\{[^}]*opacity:\s*0/);
    expect(css).toMatch(/data-scene-state="live"/);
  });
});
