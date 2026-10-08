# Phase 0 findings: baseline and spikes

Recorded 2026-10-08 for the Signal overhaul ([plan](../plans/2026-10-08-monochrome-systems-ui-overhaul.md), [ADR 0011](../architecture/0011-monochrome-surfaces-motion-and-3d.md)).
Raw data: [`phase-0-baseline.json`](./phase-0-baseline.json), produced by `scripts/measure-baseline.mjs`.

## Environment

Node v20.20.2 (the repo declares 24.x), pnpm 10.33.2, Next.js 16.1.1 (Turbopack), `next build` and `next start` with no database, so every public page renders its deterministic fallback content. Chromium headless shell 1243 driven by Playwright. Profiles follow ADR 0009: desktop 1440×900; constrained mobile 360×800, DPR 2, 4× CPU, 150 ms RTT, 1.6 Mbps down. These are lab numbers for comparison, not field scores.

## 1. Baseline of the current public site

| Route           | HTML (KB) | Initial JS (KB gz) | LCP desktop | LCP mobile profile | CLS | TBT mobile |
| --------------- | --------: | -----------------: | ----------: | -----------------: | --: | ---------: |
| `/`             |      36.2 |              524.7 |      464 ms |             748 ms |   0 |      95 ms |
| `/about`        |      19.7 |              524.7 |       88 ms |            2204 ms |   0 |      46 ms |
| `/contact`      |      17.0 |              524.7 |       80 ms |             588 ms |   0 |      69 ms |
| `/projects`     |      25.7 |              524.7 |      336 ms |             576 ms |   0 |     104 ms |
| `/case-studies` |      22.3 |              524.7 |      332 ms |             568 ms |   0 |      53 ms |
| `/articles`     |      25.1 |              524.7 |      328 ms |             584 ms |   0 |     139 ms |
| `/videos`       |      22.0 |              524.7 |      328 ms |             584 ms |   0 |      53 ms |
| `/privacy`      |      15.9 |              524.7 |       84 ms |             568 ms |   0 |      63 ms |
| `/terms`        |      15.5 |              524.7 |       76 ms |             572 ms |   0 |      60 ms |

Initial JS is the gzip size of every `<script>` in the served HTML (22 tags, the same on every public route). `/admin/signin` loads 16 scripts, 204.0 KB.

**Scroll smoothness** (scripted 10 s scroll, `/`, `/about`, `/case-studies`): p50 16.7 ms, p95 16.7 to 16.8 ms, dropped frames 0 to 0.3 %, zero long animation frames, on both profiles. The current site is smooth because it does very little; the new site must keep these numbers while doing much more.

### Findings

1. **The initial-route JS budget is missed by 2.9× (524.7 KB against 180 KB).** The largest initial chunk, 152.8 KB gzip (627 KB raw), is the whole `lucide-react` namespace: `src/components/ui/icon.tsx` does `import * as icons from "lucide-react"`, which ADR 0002 explicitly forbids for public client bundles. Replacing it with named imports is the single biggest win (about 145 KB). The remaining initial chunks (92.8, 68.4, 48.3, 38.5, 29.8, 22.0 KB and smaller; Redux is about 9 KB) need itemising in Phase 1 to find the framework floor.
2. The video stack is correctly lazy. `react-player` pulls hls.js, Mux and media-chrome into three chunks of about 229, 172 and 131 KB gzip that are not in the initial scripts. They still hurt video detail pages; replacing `react-player` with a thin YouTube facade is a Phase 6 candidate.
3. No web font is loaded today, so adding fonts cannot regress an existing look; the budget impact is below.

## 2. Spike S1: 3D bundle cost and the R3F decision

Scratch project, esbuild, minified, gzip level 9:

| Candidate                                                |     gzip | Note                                    |
| -------------------------------------------------------- | -------: | --------------------------------------- |
| GSAP core + ScrollTrigger + SplitText + Lenis            |  53.1 KB | Motion chunk (budget ≤ 60 KB)           |
| GSAP core + ScrollTrigger + Lenis                        |  50.1 KB |                                         |
| Vanilla Three, the maquette's named imports              | 135.4 KB | 3D chunk (budget ≤ 170 KB)              |
| `@react-three/fiber` v9, React externalised, empty scene | 242.5 KB | Imports all of `three`; no tree shaking |
| OGL (lean fallback)                                      |  14.0 KB | Would need hand-written lighting        |

**Decision: vanilla Three, no R3F, no drei.** Risk R4 is resolved. The prototype scene ([`docs/prototypes/signal-tile`](../prototypes/signal-tile/index.html)) renders with 40 draw calls and about 14k triangles (budget: 40 and 150k), uses a procedural environment, one baked shadow pass and a pooled glow sprite, and needs no model, HDR or worker.

Not yet measured: real-GPU frame time and the cost of glass over the live canvas. Headless software rendering (about 6 to 8 fps) says nothing about hardware. The tile has an overlay (`?debug=perf`) and a runtime governor so the numbers can be read on a real laptop and phone (see the sign-off steps in the Phase 0 summary).

## 3. Spike S2: the live style and motion tile

[`docs/prototypes/signal-tile/index.html`](../prototypes/signal-tile/index.html) is a single file that opens by double click (libraries come from a CDN; it is a prototype, not production code). It contains: the hero with the lit maquette and pulse, the tier system (`?tier=0..3`) with the poster pipeline (T1 renders one frame, turns it into an image and releases WebGL), the zone switcher, the evidence strip, the pinned stack scene, the boundary wipe into a paper band, the process wire, the system lab (ramp, type, glass, status marks), the console dashboard tile, the final CTA and footer wordmark, the command palette (⌘K), the theme flip, and a reduced-motion switch. One clock drives Lenis, ScrollTrigger and the renderer.

Issues the tile surfaced, now designed into the plan (see plan 3.2, 3.7.1):

- **Fixed glass must follow the tone beneath it.** A dark glass header or dock over a paper band is unreadable. The tile solves it by flipping `data-tone` on fixed chrome when it crosses a band; this becomes a rule ("chrome tone") in the plan.
- **Triggers created before a pin must refresh after it.** Header, nav and tone triggers were offset by the pin length until given a lower `refreshPriority` and a single debounced refresh after fonts and load (rule F10).
- The H1 at the planned size overpowered the maquette; it is smaller in the tile, and the maquette camera uses a view offset so the system sits right of the copy.

## 4. Spike S3: fonts, View Transitions, Lenis

| Font (latin woff2)                                 |    Size |
| -------------------------------------------------- | ------: |
| Archivo variable, `wdth` 62–125 and `wght` 100–900 | 88.0 KB |
| Instrument Sans variable, `wght` 400–700           | 29.2 KB |
| Martian Mono variable, `wdth` and `wght`           | 37.5 KB |

Display plus Text (preloaded) is 117 KB, within the 150 KB budget; Mono is lazy. No subsetting is needed. Archivo with `wght` only would be 34.1 KB, which is a fallback if the width axis is cut.

`experimental.viewTransition` exists in Next.js 16.1.1 (`config-shared.d.ts`); React 19.1 stable has no `<ViewTransition>`, so enabling the flag moves the app to Next's bundled React channel. The tile uses the native `document.startViewTransition` for the theme flip (circular reveal). Whether to use the flag or a `TransitionLink` around `router.push` is decided in Phase 2 with a route-level spike; the plan's CSS-crossfade fallback stands. Lenis anchors, `lenis.stop()` for overlays and `data-lenis-prevent` are exercised by the tile; back and forward scroll restoration under Lenis is tested in Phase 2.

## 5. Spike S4: admin sweep sizing

The admin is about 20k lines across 35 files, but only about 370 spot uses of legacy style classes (status colours 150, `primary` 104, raw palette 43, `rounded-2xl/3xl` 45, shadows 26, backdrop blur 3). Most styling already goes through semantic tokens, so the token flip does most of the work and the sweep is a small number of targeted edits. Hot spots, by hits:

| File                                                | Lines | Status | Primary | Palette | Rounded | Shadow | Blur |
| --------------------------------------------------- | ----: | -----: | ------: | ------: | ------: | -----: | ---: |
| `app/admin/(protected)/page.tsx` (dashboard)        |   551 |     15 |      19 |       0 |      14 |     10 |    0 |
| `components/admin/media-library-workspace.tsx`      |  1366 |      7 |       9 |      14 |       5 |      1 |    0 |
| `components/admin/editorial-editor-primitives.tsx`  |   662 |     13 |       3 |       0 |       5 |      4 |    1 |
| `components/admin/repeatable-content-workspace.tsx` |   696 |      9 |       1 |       8 |       1 |      0 |    0 |
| `components/admin/admin-signin-form.tsx`            |   426 |      9 |       7 |       0 |       2 |      0 |    0 |
| `components/admin/admin-shell.tsx`                  |   633 |      8 |       4 |       0 |       0 |      3 |    2 |
| `components/admin/project-resource-workspace.tsx`   |   703 |      7 |       2 |       8 |       0 |      0 |    0 |
| `components/ui/data-table.tsx`                      |  1358 |      4 |       9 |       0 |       1 |      1 |    0 |
| `components/admin/taxonomy-admin-workspace.tsx`     |   614 |     12 |       0 |       0 |       0 |      1 |    0 |
| `components/ui/status-badge.tsx`                    |    41 |      2 |       2 |       9 |       0 |      0 |    0 |

Effect on the plan: Phase 8 batches stay as planned but are smaller than first feared; the dashboard, shell, `StatusBadge`, `DataTable` and the media library are the real work. The 2,175-line `site-admin-editor` has only 3 legacy hits and needs structure work (section index, action bar), not restyling.
