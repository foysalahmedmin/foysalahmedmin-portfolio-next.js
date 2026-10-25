import { CONSOLE_EFFECTS, PUBLIC_EFFECTS, type MotionEffect } from "./registry";

const cell = (value: string) => value.replace(/\|/g, "\\|");

const tierCell = (effect: MotionEffect) =>
  effect.tiers
    ? [effect.tiers.t3, effect.tiers.t2, effect.tiers.t1]
        .map((value) => (value === "none" ? "—" : value))
        .join(" / ")
    : "CSS only";

const status = (effect: MotionEffect) =>
  effect.built ? "Built" : `Phase ${effect.phase}`;

/**
 * The registry as the Markdown tables in docs/design-system/motion.md. The documentation is generated
 * from the registry (`pnpm exec tsx scripts/motion-registry-doc.ts --write`) and a unit test fails
 * when they drift, so the docs cannot disagree with the code.
 */
export function registryMarkdown(): string {
  const publicRows = PUBLIC_EFFECTS.map(
    (effect) =>
      `| ${effect.id} | ${cell(effect.name)} | ${cell(effect.trigger)} | ${effect.meaning} | ${cell(effect.timing)} | ${tierCell(effect)} | ${cell(effect.reduced)} | ${status(effect)} |`
  );
  const consoleRows = CONSOLE_EFFECTS.map(
    (effect) =>
      `| ${effect.id} | ${cell(effect.name)} | ${cell(effect.trigger)} | ${cell(effect.timing)} | ${cell(effect.reduced)} | ${status(effect)} |`
  );

  return [
    "**Public effects** (tier columns are T3 / T2 / T1: `run` scripted, `css` the CSS-only variant, `—` not run)",
    "",
    "| ID | Effect | Trigger | Meaning | Timing | T3 / T2 / T1 | Reduced or off | Status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...publicRows,
    "",
    "**Console effects** (calm preset, CSS only, no tiers)",
    "",
    "| ID | Effect | Trigger | Timing | Reduced or off | Status |",
    "| --- | --- | --- | --- | --- | --- |",
    ...consoleRows,
  ].join("\n");
}

export const REGISTRY_START = "<!-- registry:start -->";
export const REGISTRY_END = "<!-- registry:end -->";
