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

## Verification

- Bundle boundary test and build-output scan (admin and `components/ui` free of the engine libraries).
- Per-route initial JS and deferred chunk sizes asserted in CI against the table above.
- The smoothness harness (first version: `scripts/measure-baseline.mjs`) runs on every phase from Phase 2.

## Rollback implication

Each library sits behind an adapter and a kill switch. Removing GSAP, Lenis or Three leaves the custom reveal and parallax baseline and the poster-only hero in place, so rollback is a configuration change first and a dependency removal second.
