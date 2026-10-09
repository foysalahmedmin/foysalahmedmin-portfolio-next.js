/**
 * The monochrome ramp as data, for the System lab and tooling. The CSS (`src/assets/styles/public/tokens.css`)
 * is the source of truth; tests/unit/token-contrast.test.ts fails if this list drifts from it.
 */
export const MONO_RAMP = [
  {
    step: "white",
    hex: "#ffffff",
    role: "Specular highlights and 3D pulses only. Never text.",
  },
  {
    step: "50",
    hex: "#fafafa",
    role: "Paper (light background); text on dark",
  },
  { step: "100", hex: "#f2f2f2", role: "Light surface" },
  {
    step: "200",
    hex: "#e3e3e3",
    role: "Light border; strong text alternative on dark",
  },
  { step: "300", hex: "#cecece", role: "Secondary text on dark and on glass" },
  { step: "400", hex: "#ababab", role: "Muted text on dark solids" },
  {
    step: "500",
    hex: "#868686",
    role: "Faint: decorative or disabled; large text on 950 only",
  },
  { step: "600", hex: "#636363", role: "Muted text on light" },
  {
    step: "700",
    hex: "#454545",
    role: "Secondary text on light; backdrop ceiling behind dark glass",
  },
  { step: "800", hex: "#2a2a2a", role: "Dark raised surface, hover" },
  { step: "900", hex: "#161616", role: "Dark surface" },
  { step: "950", hex: "#0a0a0a", role: "Ink: dark background, text on light" },
  { step: "void", hex: "#030303", role: "Deepest shadow; 3D background only" },
] as const;

/** Semantic tokens shown in the System lab, in reading order. */
export const SEMANTIC_TOKENS = [
  "background",
  "surface-subtle",
  "surface-raised",
  "card",
  "foreground",
  "text-secondary",
  "muted-foreground",
  "text-faint",
  "primary",
  "primary-foreground",
  "secondary",
  "accent",
  "border",
  "border-strong",
  "input",
  "ring",
] as const;
