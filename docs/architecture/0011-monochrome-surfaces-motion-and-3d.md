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
   | Home length                              | Tier 1 ≤ 19 screens of scroll at 1440×900 including pins; Tier 1 + 2 ≤ 22                  |
   | Console bundle                           | Admin shell ≤ 150 KB gzip initial; no animation library in any admin chunk                 |

6. **ADR 0001 note:** the role `accent` field is kept but inert on both surfaces. Role identity is carried by texture and glyph; no contract or data change.
7. **Retired:** the P12 generated colour hero candidates are not ingested. The hero poster is rendered from the 3D scene and ingested through `ManagedMediaService`.
8. **Enhancement rule kept from ADR 0009:** if an enhancement misses a gate, disable it and ship the static fallback. Kill switches: `Site.experience.motion`, the env flag `PUBLIC_3D_ENABLED`, and the QA override `?tier=0..3`.

## Evidence (Phase 0, 2026-10-08)

Measured in a scratch project with esbuild (minified, gzip level 9): GSAP + ScrollTrigger + SplitText + Lenis 53.1 KB; GSAP core + ScrollTrigger + Lenis 50.1 KB; vanilla Three with the scene's named imports 135.4 KB; R3F with React externalised 242.5 KB; OGL 14.0 KB. Font payloads are the Google Fonts latin woff2 files. Full results: [`docs/baseline/phase-0-findings.md`](../baseline/phase-0-findings.md).

## Consequences and constraints

- Motion and 3D are enhancement only. The server HTML is complete and visible without them, and the existing SSR-`reduced` default is kept.
- The current public site already exceeds the initial-route JS budget (524.7 KB gzip against 180 KB). Phase 1 includes an initial-JS diet; the budget is not relaxed to excuse it. If the measured Next.js framework floor makes 180 KB unreachable, that becomes a separate ADR 0009 amendment backed by numbers.
- Third-party code never touches the admin bundle.

## Verification

- Bundle boundary test and build-output scan (admin and `components/ui` free of the engine libraries).
- Per-route initial JS and deferred chunk sizes asserted in CI against the table above.
- The smoothness harness (first version: `scripts/measure-baseline.mjs`) runs on every phase from Phase 2.

## Rollback implication

Each library sits behind an adapter and a kill switch. Removing GSAP, Lenis or Three leaves the custom reveal and parallax baseline and the poster-only hero in place, so rollback is a configuration change first and a dependency removal second.
