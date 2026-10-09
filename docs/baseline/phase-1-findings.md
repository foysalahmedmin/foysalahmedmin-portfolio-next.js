# Phase 1 findings: design system foundation

Recorded 2026-10-10 for the Signal overhaul ([plan](../plans/2026-10-08-monochrome-systems-ui-overhaul.md), [ADR 0011](../architecture/0011-monochrome-surfaces-motion-and-3d.md), [design system docs](../design-system/README.md)). Raw load and smoothness numbers: [`phase-1-results.json`](./phase-1-results.json), produced by `scripts/measure-baseline.mjs`. Environment as in [Phase 0](./phase-0-findings.md); the measured server ran against a throwaway local replica set seeded with the demo and foundation seeds, so public pages render real seeded content rather than the Phase 0 fallback content.

## 1. Initial JavaScript

Method: `scripts/measure-initial-js.mjs` (gzip level 9 of every `<script src>` in the served HTML, `nomodule` excluded). The Phase 0 figure was transferred bytes, so the last column repeats the Phase 0 method for the public routes.

| Route                            | Phase 0 (transferred) | Now, gzip 9 | Now, brotli | Now, transferred |
| -------------------------------- | --------------------: | ----------: | ----------: | ---------------: |
| `/`, `/about`, `/contact`, legal |              524.7 KB |    174.8 KB |    151.8 KB |         204.1 KB |
| `/case-studies`, `/videos`       |              524.7 KB |    176.4 KB |    153.2 KB |         220.4 KB |
| `/articles`                      |              524.7 KB |    186.5 KB |    162.0 KB |         232.0 KB |
| `/projects`                      |              524.7 KB |    188.6 KB |    163.9 KB |         234.1 KB |
| `/admin/signin`                  |              204.0 KB |    159.6 KB |    138.1 KB |                - |

Itemised, one change at a time (gzip): lucide namespace import -152.8 KB; `sanitize-html` + htmlparser2 + postcss reaching the client through `portfolio-contract.ts` -99.2 KB; zod reaching the client (contact form, `pillars`, `slug`) -49.2 KB; interactive discovery sections imported statically by every route -15.6 KB; Redux Toolkit + react-redux for three settings -9.1 KB.

What is left on `/`: React DOM 68.4 KB, the Next client 29.8 KB and its router/runtime chunks (about 143 KB for the framework in total, see the admin sign-in row), `next/image` 10.0 KB, `tailwind-merge` and `cva` about 9 KB, and about 25 KB of app code. **The framework floor is below 180 KB, so the budget stands** (ADR 0009). `/projects` and `/articles` are over on the gzip figure because their filters are about 14 KB of client code; the Phase 6 rebuild has an explicit gate. The admin console budget (150 KB) is below the sign-in floor and is revisited in Phase 7 (ADR 0011).

## 2. Layout stability and the font swap

The first measurement with the new fonts showed CLS of 0.03 to 0.10 on the constrained mobile profile (the Phase 0 site: 0). Cause: Archivo's width axis. Against Arial Bold at the same size, Archivo at `wdth` 125 / `wght` 800 is 1.282 times wider (1.192 at 118, 1.109 at 112, 0.952 at 100; spread under 0.025 over eight real headlines), so every headline re-wrapped when the font swapped in, and `next/font`'s own fallback is tuned for the default instance only. Two fixes: per-width calibrated fallback faces (`public/fonts.css`), and a specificity bug in the heading rule that had hidden them (`:where()` now keeps it at zero). Result: with the fallback and with Archivo the H1 has the same line count and height, and constrained-mobile CLS is at most 0.013 on every public route in the load measurement (0.004 or less in the shift-source probe on the list pages).

## 3. Quality gates

| Check                                                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lighthouse (desktop preset, local)                            | Performance 99-100, accessibility 100 on every route (a heading-order finding on `/contact` was fixed), best practices 100, CLS 0, LCP under 0.9 s. SEO scores are 54-66 only because the site is `noindex` until launch (Phase 10)                                                                                                                                                                                   |
| axe, WCAG 2.2 AA tags, 10 routes x 2 themes x 2 viewports     | 0 violations of any impact (the first run found a `<dl>` structure error on the home metrics strip; fixed with `StatusMark`)                                                                                                                                                                                                                                                                                          |
| Consistency probe, public routes, both themes, both viewports | Pass, including a seeded case study (A3), project and article (A4)                                                                                                                                                                                                                                                                                                                                                    |
| Chrome tone (header over the `CtaBand`), both themes          | Pass; header text over the band is at least 4.5:1                                                                                                                                                                                                                                                                                                                                                                     |
| Scroll smoothness (10 s scripted scroll)                      | p95 16.7-16.8 ms, 0 % dropped, 0 long animation frames on both profiles (unchanged from Phase 0)                                                                                                                                                                                                                                                                                                                      |
| Admin pixel identity                                          | 24 authenticated screenshots (12 workspaces x light and dark) of the final build against a build of the Phase 0 commit on the same database state: 22 byte-identical; the other 2 (the dashboard in each theme) differ only inside the "Refreshed <time>" label (rows 380-392). An earlier run also showed at most 2/255 rasteriser noise on a few pixels that likewise appears between two runs of the Phase 0 build |
| Unit and integration suites, typecheck, lint                  | Green (see the ledger)                                                                                                                                                                                                                                                                                                                                                                                                |

## 4. Decisions made while building

- **Fonts:** self-hosted latin variable woff2 files with `next/font/local`, not `next/font/google`. Same bytes (Archivo 90.1 KB, Instrument Sans 29.9 KB, Martian Mono 38.4 KB on disk), no network at build time.
- **`<html>` carries the surface**, not only the layout wrapper: portals and not-found render outside the public layout. Set by an inline script before first paint and kept right by `SurfaceMarker`.
- **Control borders on paper:** `--line-4` is black at 48 %, not 40 %; the new contrast test showed 40 % is 2.83:1 against the 3:1 requirement.
- **Page header is a `div`**, not a `<header>`: a `<header>` inside `<main>` is not a landmark but tools and tests count it as a second banner.
- **Index H1 stays at `--step-5`** (the plan value). It reads as an engineering plate on one or two lines and is acceptable at three; revisit in the Phase 9 motion and type review.
- **Contact map (C-06) decided:** the Contact page embeds no map and loads no third-party map code. `contact.map_policy` stays `hidden | city_only`; `city_only` will render a static greyscale city block in Phase 6 if the owner enables it. Nothing to remove: no embed existed.
- **Redux removed** for a 100-line external store with the same persisted `setting` key, so saved themes carry over.
- **Token files:** tones and texture live in `tokens.css` and `glass.css`; there is one token file for both surfaces (the console surface is defined but not switched on). The plan's file map is updated.
- **Dead code removed:** `base/fonts.css` (Roboto, never loaded), the twelve brand icon components (unused, with colour literals), `use-ripple-effect`, `setting-applier`.
- **Admin preview:** `/admin/preview/pages/[routeKey]` renders the public site, so it now carries the public surface and font scope while the admin around it stays legacy.

## 5. Not done in Phase 1 (by design)

Phase 2 (motion engine, `Reveal` v2, palette, harness gate in CI), Phase 3 (shell rebuild, hero, 3D), Phase 6 (detail sections onto `PageHeader`, index rebuild), Phase 7 (the admin adopts the console surface, `StatusMark` behind `StatusBadge`, authenticated e2e fixtures). The throwaway authenticated session used for the admin comparison was a local replica set with the real bootstrap script; Phase 7 turns that into a committed Playwright fixture.
