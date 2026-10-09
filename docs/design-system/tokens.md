# Tokens

Defined once in [`src/assets/styles/public/tokens.css`](../../src/assets/styles/public/tokens.css) and applied through attributes. Every value is pure neutral: hue never carries meaning.

## Surfaces, tones, density

| Attribute                                  | Meaning                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `data-surface="public"`                    | The expressive "stage". Set on the public layout wrapper **and** on `<html>`.                |
| `data-surface="console"`                   | The calm "workbench". Defined, but the admin does not set it until Phase 7 (strangler rule). |
| `data-tone="ink"` / `"paper"` / `"invert"` | Re-declares the semantic tokens for a subtree. `invert` is the opposite of the page theme.   |
| `data-density="comfortable"` / `"compact"` | Control height, UI text, hit area. Public is comfortable, console is compact.                |
| `data-band`                                | Marks a tone band for the chrome-tone controller (the `CtaBand` is one).                     |
| `data-chrome`                              | Marks fixed chrome (the header); its `data-tone` follows the band beneath it.                |

**Why `<html>` carries the surface too.** Portals (modals, the palette) mount under `<body>`, outside the layout wrapper, and `not-found` renders outside the public layout. An inline script in the root layout sets `data-surface="public"` on every non-admin path before first paint, and `SurfaceMarker` keeps it correct across client navigations and adds the font variable classes to `<html>`.

**Strangler rule.** `variables.css` (the legacy tokens) is untouched. Where no surface attribute is set, nothing in the Signal files applies, so the admin renders exactly as it did. This was verified by pixel comparison of 24 authenticated admin screenshots against the Phase 0 build (see the Phase 1 findings): only a timestamp differs.

**Theme.** The theme is the `dark` class on `<html>`. First visit on the public site is dark; a saved choice always wins; the admin defaults to the system setting.

## Ramp

| Token          | Hex       | Role                                                        |
| -------------- | --------- | ----------------------------------------------------------- |
| `--mono-white` | `#ffffff` | Specular highlights and 3D pulses only. Never text.         |
| `--mono-50`    | `#fafafa` | Paper (light background); text on dark                      |
| `--mono-100`   | `#f2f2f2` | Light surface                                               |
| `--mono-200`   | `#e3e3e3` | Light border; strong text alternative on dark               |
| `--mono-300`   | `#cecece` | Secondary text on dark and on glass                         |
| `--mono-400`   | `#ababab` | Muted text on dark solids                                   |
| `--mono-500`   | `#868686` | Faint: decorative or disabled; large text on 950 only       |
| `--mono-600`   | `#636363` | Muted text on light                                         |
| `--mono-700`   | `#454545` | Secondary text on light; backdrop ceiling behind dark glass |
| `--mono-800`   | `#2a2a2a` | Dark raised surface, hover                                  |
| `--mono-900`   | `#161616` | Dark surface                                                |
| `--mono-950`   | `#0a0a0a` | Ink: dark background, text on light                         |
| `--mono-void`  | `#030303` | Deepest shadow; 3D background only                          |

`src/lib/design/mono-ramp.ts` mirrors this table for the System lab; `token-contrast.test.ts` fails if it drifts.

## Semantic tokens

The names are the existing Tailwind theme names (`--background`, `--foreground`, `--card`, `--primary`, ...), so every existing component picks them up. Additions: `--text-secondary`, `--text-faint`, `--line-1` to `--line-4`, `--focus-ink`, `--focus-paper`, `--glass-1-bg` to `--glass-3-bg`, `--elev-1` to `--elev-4`. Utilities: `text-fg-secondary`, `text-fg-faint`, `border-line-1..4`.

State is never a hue. `--destructive`, `--success`, `--warning` and `--info` resolve to greys; the five `--pillar-*` colours collapse to `--foreground`; `--chart-*` and `--sidebar-*` map to greys. State is told apart by glyph, label, weight and pattern (`StatusMark`, `FieldError`, `Toast`).

Control borders (`--input`, `--border-strong`, `--line-4`) reach 3:1 on both tones. On paper `--line-4` is black at 48 %, not the plan's 40 %: the contrast test showed 40 % gives 2.83:1.

## Shape and depth

- Radius: public 2 / 6 / 10 px (`--r-control`, `--r-panel`, `--r-slab`), console 2 / 4 / 6 px. The existing `rounded-md`, `rounded-lg`, `rounded-xl` and Tailwind's `rounded-2xl/3xl` resolve through these tokens, so no component edit was needed.
- Elevation: black shadows only (`--elev-1..4`, and the legacy `--shadow-*` are remapped).
- Texture and grain: `.tx-blueprint`, `.tx-lines`, `.tx-dots` (role textures), `.hairline-grid`, `.ticks` (corner ticks), `.grain` (a static 14 KB noise PNG, `public/textures/grain.png`, regenerated by `scripts/generate-grain-texture.mjs`).

## Type

Fonts are self-hosted latin variable woff2 files in `src/assets/fonts/`, loaded by `next/font/local` in `src/app/(common)/fonts.ts` (public routes only; the admin pays nothing): Archivo (`wdth` 62-125), Instrument Sans, Martian Mono (lazy). The scale is `--step--2` to `--step-6` (fluid, rem floor). Utilities: `.t-eyebrow`, `.t-caption`, `.t-body`, `.t-lead`, `.t-h4` to `.t-h1`, `.t-wordmark`, `.t-mono`, `.t-measure`. The legacy `.type-*` classes are bridged to the same scale on the public surface.

**Calibrated display fallbacks.** Archivo's width axis made every headline re-wrap when the font swapped in (lab CLS up to 0.10 on the constrained mobile profile). `fonts.css` defines one fallback face per width step, scaled to the measured width of Archivo against Arial Bold (1.282, 1.192, 1.109 and 0.952 for `wdth` 125, 118, 112 and 100). With them the fallback wraps exactly like the real face and CLS is at most 0.013 on the constrained mobile profile. Never use `ch` widths on display type: `ch` follows the glyph width and re-wraps on swap.

## Glass

`.glass-1`, `.glass-2`, `.glass-3` (and the `Glass` component) with `@supports`, `prefers-reduced-transparency`, `prefers-contrast` and forced-colours fallbacks. Rules enforced by `token-contrast.test.ts`: dark glass alpha at most 0.08 under body text, the backdrop behind it at most `--mono-700`, `glass-3` only over the overlay scrim, muted text on glass uses `--mono-300`.

## Focus

A double ring (2 px ink outside, 2 px paper inside, offset 2 px) on every focusable element of both surfaces, so one ring always contrasts (`token-contrast.test.ts` checks every grey in the ramp). `data-force-state="focus"` shows it without moving focus (System lab only).

## CSS layers

`tokens.css`, `fonts.css`, `type.css` load in `@layer base` with the legacy files; `glass.css` and `marks.css` in `components`; `focus.css`, `layout.css` and `state.css` in `utilities`, after Tailwind's generated utilities, so they can replace `focus-visible:outline-none`, `border`, `bg-muted` and `container` on the public surface without `!important`. The public `container` is the token width (1360 px) with the gutter as its only inset: header, page header, sections, `CtaBand` and footer share one edge.

## Adding or changing a token

1. Edit `tokens.css` (and `mono-ramp.ts` if it is a ramp step).
2. If it is a colour, `monochrome-guard.test.ts` requires it to be neutral and `token-contrast.test.ts` shows whether the pairs still pass.
3. Show it in the System lab.
4. Update this file in the same PR.

## Legacy tokens (the admin until Phase 7)

The tokens in `src/assets/styles/base/variables.css` are unchanged and still drive the admin: it sets no `data-surface`, so none of the Signal rules above apply to it. The notes below are the original guidance for those tokens and stay true until the console surface replaces them (Phase 7 and 8). On the public surface the same names resolve to greys (see Semantic tokens).
The visual system uses semantic tokens. Components should describe intent
(`background`, `surface-raised`, `muted-foreground`, `success`) instead of
choosing a raw color. The five pillar accents are reserved for pillar identity,
diagrams, filters, and short emphasis—not body copy.

### Surfaces and hierarchy

- `background`: page canvas.
- `surface-subtle`: quiet section or input background.
- `surface-raised`: cards, popovers, and elevated navigation.
- `surface-inverse`: rare high-contrast bands.
- `border` / `border-strong`: default and emphasized separation.
- `overlay`: modal/drawer scrim.

### Status colors

Use paired foreground values for filled status surfaces. Never communicate a
state through color alone; keep a text label or icon with an accessible name.

### Pillars

The canonical order is Frontend, Backend, AI Automation, System Design, and
Full-Stack. Each has an accent plus a low-chroma surface token in both themes.
Do not remap colors per page.

### Layout and type

Use the `Container`, `Section`, `Stack`, `Cluster`, `Grid`, and `Bleed`
primitives. `wide` supports the 12-column 1360px composition, `content` supports
normal page narratives, and `reading` bounds long-form copy. Fluid type classes
are `type-display`, `type-heading-1/2/3`, `type-lead`, `type-label`, and
`type-metric`; sanitized long-form content uses `editorial`.

### Motion

Durations, easing, reveal distance, and parallax depths are tokenized. Motion
may change transform and opacity only unless a component-specific review says
otherwise. OS/user reduced motion always wins.
