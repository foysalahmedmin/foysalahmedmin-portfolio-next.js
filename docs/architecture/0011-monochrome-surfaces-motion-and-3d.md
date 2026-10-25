# ADR 0011: Monochrome surfaces, motion engine, and 3D enhancement budget

- **Status:** Accepted (owner approved plan v1.2 on 2026-10-08)
- **Date:** 2026-10-08
- **Decision owners:** Product owner and repository maintainer
- **Amends:** [ADR 0002](./0002-custom-ui-dependencies-and-testing.md) (runtime motion framework ban), [ADR 0009](./0009-browser-support-and-quality-profile.md) (budgets)
- **Plan:** [`docs/plans/2026-10-08-monochrome-systems-ui-overhaul.md`](../plans/2026-10-08-monochrome-systems-ui-overhaul.md)

## Context

The public site and the admin console are being rebuilt on one monochrome design system with choreographed motion and a 3D hero. ADR 0002 forbids a runtime motion framework, and ADR 0009 has no budget category for enhancement code that loads after the first render. Phase 0 measured the real cost of the candidate libraries (evidence below).

## Decision

1. **Allowed runtime dependencies:** `gsap` (core, `ScrollTrigger`, `SplitText`) with `@gsap/react`, `lenis`, and `three` (vanilla, named imports only). Each is imported by one repository-owned adapter, loaded after hydration (3D after LCP and idle), and is absent for reduced-motion, motion-off, tier T0/T1, touch-only smooth scroll, and no-JS visitors. The existing custom `Reveal`, `ParallaxLayer`, `MotionProvider` and `ParallaxProvider` remain the baseline and the T1 fallback.
2. **Not adopted: `@react-three/fiber`.** React Three Fiber v9 imports all of `three` and costs 242 KB gzip for an empty canvas; vanilla Three with named imports costs 135 KB gzip for the whole scene's dependencies. `@react-three/drei` is not adopted either. OGL (14 KB gzip) is the documented lean fallback if the 3D budget is ever exceeded.
3. **Boundaries:** none of GSAP, Lenis or Three may be imported from `src/app/admin`, `src/components/admin` or `src/components/ui`. Engine-dependent components live in `src/components/motion` and `src/components/three`. A unit test walks the import graph and a build-output scan asserts that no `/admin` chunk contains them.
4. **One system, two surfaces:** one token set applied through `[data-surface="public"]` and `[data-surface="console"]` plus `[data-density]`. The admin flips to the console surface under a strangler migration: shared primitives are tokenised with their legacy values as fallbacks, so they render unchanged wherever no surface attribute is set.
5. **ADR 0009 amendments** (the initial-route and third-party budgets are unchanged):

   | Budget                                   | Value                                                                                      |
   | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
   | Deferred motion chunk                    | ≤ 60 KB gzip (measured 53 KB: GSAP core + ScrollTrigger + SplitText + Lenis)               |
   | Deferred 3D chunk                        | ≤ 170 KB gzip (measured 135 KB for the scene's Three dependencies)                         |
   | Lab CLS                                  | ≤ 0.05 (field p75 stays ≤ 0.10)                                                            |
   | Smoothness, desktop                      | p95 frame ≤ 18 ms, dropped frames ≤ 2 %, ≤ 2 long animation frames after hydration         |
   | Smoothness, constrained mobile (tier T2) | p95 frame ≤ 33 ms, dropped frames ≤ 8 %                                                    |
   | Lab INP (primary interactions)           | p75 ≤ 100 ms (field gate stays ≤ 200 ms)                                                   |
   | Fonts blocking first paint               | ≤ 150 KB woff2 (measured 117 KB: Archivo 88.0 + Instrument Sans 29.2); Mono lazy (37.5 KB) |
   | Home length                              | Tier 1 ≤ 24 screens of scroll at 1440×900 including the three pins; Tier 1 + 2 ≤ 27        |
   | Console bundle                           | Admin shell ≤ 150 KB gzip initial; no animation library in any admin chunk                 |

   The initial-route and third-party budgets are measured as the sum of gzip level 9 sizes of the scripts in the served HTML, `nomodule` polyfills excluded; brotli is recorded alongside (see "Phase 1 outcome").

6. **ADR 0001 note:** the role `accent` field is kept but inert on both surfaces. Role identity is carried by texture and glyph; no contract or data change.
7. **Retired:** the P12 generated colour hero candidates are not ingested. The hero poster is rendered from the 3D scene and ingested through `ManagedMediaService`.
8. **Enhancement rule kept from ADR 0009:** if an enhancement misses a gate, disable it and ship the static fallback. Kill switches: `Site.experience.motion`, the env flag `PUBLIC_3D_ENABLED`, and the QA override `?tier=0..3`.

## Evidence (Phase 0, 2026-10-08)

Measured in a scratch project with esbuild (minified, gzip level 9): GSAP + ScrollTrigger + SplitText + Lenis 53.1 KB; GSAP core + ScrollTrigger + Lenis 50.1 KB; vanilla Three with the scene's named imports 135.4 KB; R3F with React externalised 242.5 KB; OGL 14.0 KB. Font payloads are the Google Fonts latin woff2 files. Full results: [`docs/baseline/phase-0-findings.md`](../baseline/phase-0-findings.md).

## Consequences and constraints

- Motion and 3D are enhancement only. The server HTML is complete and visible without them, and the existing SSR-`reduced` default is kept.
- The Phase 0 site exceeded the initial-route JS budget (524.7 KB transferred against 180 KB). Phase 1 ran the initial-JS diet and the budget was not relaxed: see "Phase 1 outcome" below.
- Third-party code never touches the admin bundle.

## Phase 1 outcome (2026-10-10)

**Initial-route JavaScript.** The budget figure is the sum of gzip level 9 sizes of every `<script src>` in the served HTML, `nomodule` polyfills excluded because browsers with ES modules never fetch them (`scripts/measure-initial-js.mjs`). Production CDNs serve brotli, which is about 13 % smaller; both are recorded.

| Route                            | Phase 0 (transferred) | Now (gzip 9) | Now (brotli) |
| -------------------------------- | --------------------: | -----------: | -----------: |
| `/`, `/about`, `/contact`, legal |              524.7 KB |     174.8 KB |     151.8 KB |
| `/case-studies`, `/videos`       |              524.7 KB |     176.4 KB |     153.2 KB |
| `/articles`                      |              524.7 KB |     186.5 KB |     162.0 KB |
| `/projects`                      |              524.7 KB |     188.6 KB |     163.9 KB |
| `/admin/signin`                  |              204.0 KB |     159.6 KB |     138.1 KB |

What removed about 326 KB (measured one change at a time; the rest of the 350 KB gap is the method, since transferred bytes include headers and Next's faster gzip level): the `lucide-react` namespace import in `ui/icon.tsx` (-152.8 KB), `sanitize-html` with htmlparser2 and postcss reaching the client through `portfolio-contract.ts` (-99.2 KB, now `article-body.ts`, server only), zod reaching the client through the contact form and `pillars`/`slug` (-49.2 KB; the contact schema now loads on first field focus, the other schemas moved to `*.schema.ts`), the four interactive discovery sections imported statically by `PublicRoutePage` (-15.6 KB on every non-list route; each list route now passes its own renderer), and Redux Toolkit plus react-redux for three settings (-9.1 KB; replaced by a 100-line external store, `src/state/setting-store.ts`).

**Result.** The framework floor measured on the admin sign-in page is 159.6 KB gzip, so 180 KB is reachable and the budget stands. Five of seven public route families pass on the gzip figure. `/projects` and `/articles` exceed it by 8.6 and 6.5 KB gzip (both pass on brotli) because their interactive filters are about 14 KB gzip of client code; their Phase 6 rebuild carries an explicit gate: every index route at or under 180 KB gzip. The console bundle row above (admin shell at most 150 KB gzip) sits below the measured floor of the sign-in page (159.6 KB, of which the framework alone is about 143 KB); Phase 7 measures the real shell and amends that row with numbers before building to it.

**Amendments recorded.** Fonts are self-hosted latin variable woff2 files loaded with `next/font/local` (the same files `next/font/google` would serve, but the build needs no network). `@reduxjs/toolkit` and `react-redux` are removed. The admin stays pixel-identical: 24 authenticated screenshots (12 workspaces, both themes) of the final build against the Phase 0 build on the same database state differ only inside the dashboard's "Refreshed <time>" label.

## Phase 2 outcome (2026-10-25)

**Deferred enhancement JavaScript.** The motion chunk (GSAP 3.15.0 with ScrollTrigger and SplitText, Lenis 1.3.26, and the behaviours) is **53.8 KB gzip** against the 60 KB budget (`scripts/measure-motion-chunk.mjs`, which also fails when the chunk appears in any route's initial scripts). It loads after hydration and idle, only for full motion, a fine pointer and tier 2 or above. Reduced, off and touch visitors never download it; a failed load leaves the server markup untouched and reports one privacy-safe `engine_load_failed` event. The enhancements chunk (route shutter, scroll restoration, cursor, engine host) is about 2.8 KB, the command palette about 2.6 KB and the perf overlay 1.0 KB, all deferred.

**Initial-route JavaScript** moved by 1.5 to 1.7 KB gzip on public routes (home family 174.8 to 176.5 KB, `/case-studies` 178.0, `/articles` 188.0, `/projects` 190.2) and by 0.5 KB on the admin sign-in (160.1 KB) through the shared reveal applier. The 180 KB budget stands; `/projects` and `/articles` keep their Phase 6 gate; the console row is still to be amended in Phase 7.

**Boundary enforced.** `tests/unit/bundle-boundary.test.ts` walks the import graph: only `src/lib/motion/engine/*` imports GSAP or Lenis, nothing the admin or `components/ui` can reach touches the engine, the engine is imported dynamically by one file, and the public layout reaches it only through the deferred enhancements. Components receive the live engine through `useEngine()` and import only its types.

**Amendments recorded.**

- Touch visitors are excluded from the engine (the acceptance line, and plan 3.16 already said no Lenis on touch). They keep CSS reveals, the route shutter where View Transitions exist, the palette and the rail.
- Pinned scenes are CSS `position: sticky` tracks; a ScrollTrigger fixed pin measured as a 0.95 layout shift at each start and end.
- The Motion lab is a public-surface route (`/lab/motion`, served in development and with `MOTION_LAB=1`), because the admin may not import animation libraries.
- The route transition is a feature-detected manual `startViewTransition` wrapper, not `experimental.viewTransition`; `@gsap/react` is not adopted.
- The smoothness harness gates in CI (desktop and 4x-CPU mobile, median of three) and carries a self-test. Measured on the production build: p95 frame interval 16.7 to 16.8 ms, dropped frames at most 0.18 %, no long animation frames, layout shift at most 0.0009, interaction p75 32 to 40 ms, on `/`, `/about`, `/projects` and the all-effects Motion lab.

Full evidence: [`docs/baseline/phase-2-findings.md`](../baseline/phase-2-findings.md).

## Phase 3 outcome (2026-10-26)

Full evidence: [`docs/baseline/phase-3-findings.md`](../baseline/phase-3-findings.md).

The shell, the three-role hero and the vanilla Three.js scene are built, and every plan 6.2 budget is met on the constrained profile. The scene is one dynamic import (138.0 KB gzip, budget 170), created only after the engine settles and only when the tier, the GPU probe and the two kill switches (`PUBLIC_3D_ENABLED`, site motion `off`) allow it; it pauses off screen, is released after four seconds, and falls back to the static poster, which is rendered from the same scene. On a real GPU the live hero holds p95 16.7 ms on desktop and 16.8 ms on the phone profile; the harness is green on all routes. Initial JS is 179.96 KB (budget 180), Home LCP 1,244 ms, TBT 118 ms and CLS 0.012 on the constrained profile. The browser caught a hero scene with no height on a real GPU, a context-lost handler that kept the canvas from coming back, a poster left under the live canvas and, last, the cause of the blocking time: effects that each forced a full layout at mount. Layout reads at mount now go through one read-then-write frame (`src/lib/dom/frame-batch.ts`); Home TBT went from 735 ms in Phase 2, on the same data, to 118 ms.

## Verification

- Bundle boundary test and build-output scan (admin and `components/ui` free of the engine libraries).
- Per-route initial JS and deferred chunk sizes asserted in CI against the table above.
- The smoothness harness (`tests/e2e/smoothness.spec.ts`, the `smoothness` CI job) gates every phase from Phase 2; `scripts/measure-baseline.mjs` records the load metrics.

## Rollback implication

Each library sits behind an adapter and a kill switch. Removing GSAP, Lenis or Three leaves the custom reveal and parallax baseline and the poster-only hero in place, so rollback is a configuration change first and a dependency removal second.
