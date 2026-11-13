# Release checklist (Signal overhaul, ADR 0009 and Phase 9)

Measured on 2026-11-13 against a local production build (`pnpm build`, `pnpm start`) on a throwaway replica-set database with every live service blanked. Nothing here touched the owner's database or a real service. Numbers are medians of three runs unless marked. "Not run" means exactly that: no result exists.

Launch steps and the owner's facts are in the [launch runbook](./launch-runbook.md). Evidence per phase: [`docs/baseline/`](../baseline/).

## 1. Automated, run and green

| Check                                                                                                                             | Result                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm exec tsc --noEmit`, `pnpm lint`                                                                                             | Clean                                                                                                                                                                                                                                                                 |
| `pnpm test` (unit and integration, integration on an empty replica-set database)                                                  | 251 files, 1,863 tests pass                                                                                                                                                                                                                                           |
| `pnpm build`                                                                                                                      | Passes                                                                                                                                                                                                                                                                |
| Content-truth gate (`tests/unit/content-truth-gate.test.ts`) and design lint                                                      | Pass; the admin allowlist rows are gone, only `global-error.tsx` is allowed                                                                                                                                                                                           |
| Initial JS, public routes (gzip -9, non-nomodule scripts, budget 180 KB)                                                          | 177.3 KB on every public route (2.7 KB under); case-study detail 170.6 KB                                                                                                                                                                                             |
| Initial JS, console                                                                                                               | Shell 164.1 KB (target 150), lists and editors 163 to 187 KB, media 200.7 KB, **Site editor 239.6 KB (target shell + 60 = 210)**                                                                                                                                      |
| Lighthouse, mobile default (simulated slow 4G, 4x CPU)                                                                            | Home 84 / 100 / 100 / 100 (LCP 4,292 ms, TBT 119 ms, CLS 0.012); About 85 (4,206, 16, 0); Projects 87 (4,056, 11, 0.003); Articles 87 (4,056, 9, 0.003); case study 80 (5,128, 15, 0), SEO 91. Phase 3 for the home: 83, TBT 154, LCP 4,236, CLS 0.012: no regression |
| Lighthouse, desktop preset (the repo's `lighthouserc.json` profile: performance at least 0.9, LCP at most 2,500, CLS at most 0.1) | Home 99 (LCP 910 ms, TBT 0, CLS 0.027), About 100 (812, 0, 0.003), Projects 100 (772, 0, 0.005): met. Accessibility, best practices and SEO are 100                                                                                                                   |
| Motion smoothness harness (`pnpm test:smoothness`, desktop and phone profiles)                                                    | 8 of 8 pass: Home, About, Projects, `/lab/motion`. Run **once** here; the acceptance line asks for three in a row                                                                                                                                                     |
| Axe, public routes (`public-quality.spec.ts`), console shell, dashboard, list, editor and 13 swept workspaces in both themes      | See section 2 for the batch result                                                                                                                                                                                                                                    |
| Console: no `backdrop-filter` outside overlays, no animation library in any admin chunk                                           | Pass                                                                                                                                                                                                                                                                  |

## 2. Browser batch (desktop and phone projects, one worker)

public-quality, consistency probe, chrome tone, contact flow and the console spec against the built server:

134 tests: **128 passed, 5 skipped (desktop-only or phone-only by design), 1 failed**. The failure was the Cmd/Ctrl+K palette test on the desktop project, in the 13-minute run: the key was pressed before the shell had hydrated. It passed on two isolated reruns (a third rerun was stopped by the sign-in rate limit, not by the palette), so the spec now retries the key until the palette opens; the whole console spec then passed 11 of 11 on desktop. The phone project of the console spec passed in the batch.

Seen along the way: the admin sign-in endpoint rate-limits, so a handful of back-to-back runs that each sign in can fail at sign-in; restart the server to clear it.

## 3. Not run here (needs a machine or person this session did not have)

| Item                                                                                                    | Why                                                                                                                                                 | Who             |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Firefox and WebKit Playwright projects                                                                  | The browsers are not installed on this machine (`pnpm exec playwright install firefox webkit`, several minutes); CI installs them from the lockfile | CI or the owner |
| `lhci autorun` on the expanded route set, and visual baselines (`pnpm test:visual:update`, then review) | No baseline snapshots are committed; they are approved by eye, not generated blind                                                                  | Owner approves  |
| Smoothness harness three times in a row, motion captures at 1x and 0.25x                                | Only one harness run and no capture review was done                                                                                                 | Next session    |
| Clean-checkout CI simulation                                                                            | Not rerun since Phase 3                                                                                                                             | CI              |

## 4. By hand, on real devices (owner)

Tick each when done; write what you saw next to any item that fails.

- [ ] **iPhone Safari:** the home opens with the first hero role complete at scroll 0 (no empty first screen); scroll the whole story; the Stack and Pipeline pins have a working "skip" link; the starting-point finder and the fit check work with touch; the contact form sends one test message.
- [ ] **A mid-range Android phone (Chrome):** the same, and watch scroll smoothness through the pinned chapters.
- [ ] **Desktop Safari and Firefox:** home, a case study, `/projects`, `/articles`, `/contact`; the filters on the case files and the Type select.
- [ ] **Screen reader pass** (VoiceOver is enough): landmarks and headings on the home, the pinned chapters, the case-file filters, the contact form errors, and in the admin: the editor save, a validation error, the section index.
- [ ] **Keyboard only:** every page reachable, focus visible on dark and light, the command palette (Cmd/Ctrl+K) in the console, Cmd/Ctrl+S in the editors.
- [ ] **OS "reduce motion" on:** the site is complete and static, nothing waits for a scroll to reveal content.
- [ ] **Motion review sign-off:** the plan asks that you approve the motion; note anything too slow, too long, or too much.
- [ ] **Kill-switch drill:** `PUBLIC_3D_ENABLED=0` (poster only), Site setting `experience.motion = off`, and the QA override `?tier=0`, `?tier=1`, `?tier=2`, `?tier=3`.
- [ ] **Light theme** on the home, a case study and the contact page.
- [ ] **Admin on a phone:** the sticky action bar on a long project or case-study form does not hide the last field; the video radio tiles; the media upload dialog.
- [ ] **Share previews:** paste a case-study URL into a chat app and check the title, description and image (see the open item below).

## 5. Open items found while measuring

- **Case-study, project, article and video detail pages stream their metadata into the body** for a normal browser (the server HTML of `/projects` has the description in the head; a case study has it about 100 KB into the body). Crawlers that Next treats as HTML-limited bots (Googlebot, the social bots) are served it in the head, so search and share cards are not affected, but Lighthouse reads it as "no meta description" (SEO 91 on the case study). The fix is a one-line Next setting that makes metadata blocking for every user agent, at a cost to time to first byte on those routes; measure before turning it on.
- The no-JavaScript skeleton (the site-wide `loading.tsx` boundary) is still a routing decision from Phase 3.
- The Site editor is 239.6 KB (see section 1).
- A Site or Page has no one-click restore of the previous published version (see the runbook, Rollback).
