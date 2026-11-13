# Phase 9 findings: hardening (2026-11-13)

Plan Phase 9 (section 7). This phase was run in the fast mode the owner asked for ("complete these, but faster"): what could be built and measured on one machine with one browser engine was; what needs real devices, other engines or a person is listed for the owner in [`docs/release/release-checklist.md`](../release/release-checklist.md). Nothing here is claimed that was not run.

## 1. Built

| Item                                     | What                                                                                                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engagement-type filter on the case files | A `Type` select, a removable chip and the URL param `engagement` (server-rendered GET form, like the other filters); the service filter is `engagement_type`. Tests in `tests/unit/case-studies-index.test.tsx`      |
| FAQPage JSON-LD on the home              | `buildFaqJsonLd(site, faqs)` in `src/lib/metadata/json-ld.ts`: HTML stripped from answers, at most 10 questions, emitted only from the published `faq-list` items. Tests in `tests/unit/metadata-foundation.test.ts` |
| Root error views                         | `app/error.tsx` and `global-error.tsx` no longer print the error digest                                                                                                                                              |
| Icon button defect                       | The console review found link-buttons with an icon shape rendering as a 2 px glyph (the editors' back arrow, the list row edit icons). Fixed in `button-variants.ts`; a console spec guards it                       |
| Console specs                            | 13 swept workspaces in both themes on the desktop and phone projects (axe), the four content editors keep a sticky bar and a real back link                                                                          |
| Release documents                        | [Release checklist](../release/release-checklist.md) and [launch runbook](../release/launch-runbook.md)                                                                                                              |

## 2. Measured

See the release checklist, section 1, for the table. Summary: public initial JS 177.3 KB (budget 180); Lighthouse mobile default Home 84 with TBT 119 ms and CLS 0.012 (Phase 3: 83, 154 ms, 0.012), desktop preset 99 to 100 with LCP under one second; smoothness harness 8 of 8; axe clean on the public routes, the shell, the dashboard and 13 workspaces in both themes; 1,863 tests pass.

## 3. Findings

1. **Detail pages stream their metadata into the body for a normal browser.** Server HTML of a case study, project, article or video has the description about 100 KB in, after the head; `/projects` has it in the head. HTML-limited bots get it in the head, so search and share cards are fine, but Lighthouse reads no meta description (SEO 91 on the case study). A one-line Next setting makes metadata blocking for all user agents; it costs time to first byte, so measure first. Not changed.
2. **The Site editor is 239.6 KB on first load**, 75 KB over the console shell (target 60). It is one client file of about 2,350 lines plus its schema. Loading only the open panel is the fix; that is a code change, not a restyle.
3. **The console shell is 164 KB against a 150 KB target.** The sign-in page alone is 160 KB, so the floor is the root layout and its providers. Not tried this phase.

## 4. Not done

- Firefox and WebKit projects (browsers not installed here), real Safari and iOS, a mid Android phone, screen-reader pass: owner and CI (checklist section 3 and 4).
- Motion tuning pass with captures at 1x and 0.25x, the harness three times in a row, the kill-switch drill by hand: next session or the owner.
- `lhci autorun` on the expanded route set and approved visual baselines (none are committed).
- The editor Preview and Publish actions in the article editor and the unsaved-changes navigation guard (R21).
- The no-JavaScript skeleton routing decision (the site-wide `loading.tsx`), open since Phase 3.
- M30, M09, M13, M15, M24, M29 and the evidence digit roll from earlier phases.
