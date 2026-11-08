# Phase 6 findings: the public inner pages (2026-11-08)

Plan section 4.2 and Phase 6 (section 7). Evidence for the acceptance lines; what was measured is separated from what was not.

## 1. What was built

Every public page is composed from its archetype template, with the shared `PageHeader`, one `h1`, and the `CtaBand` where the archetype has one. The page-specific content is rebuilt on the Signal system.

| Page                   | Archetype | What it is now                                                                                                                                                                                                   |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/case-studies`        | A2        | The home "case files" rows as the full list; a server-rendered GET filter form (search, role, category, tool, sort), removable chips, a Mono count, pagination, a static topology fragment                       |
| `/case-studies/[id]`   | A3        | Scrollytelling: Problem, Constraints, Architecture, Result. A sticky code-native SVG diagram built from the structured architecture data, lit chapter by chapter (M17); "Diagram as text"; next case file        |
| `/projects`            | A2        | "The lab": a registry table (project, role, stack, type), a GET filter form, a row preview, `LabSwitcher`; the detail is a reading column plus a sticky facts aside                                              |
| `/articles`, `/videos` | A2, A4    | Editorial rows with Mono metadata; videos are greyscale posters with Mono duration chips, a hairline player frame, a reels grid; the index is headed "Recommended watching"; reading progress on articles (M34)  |
| `/about`               | A5        | "Who is solving your problem": a Mono portrait with a mask reveal and parallax (M25), the positioning, a timeline with a drawn wire (M19), credentials as hairline rows                                          |
| `/contact`             | A6        | Ink panel with a glass form; topic chips and the removable resolved topic from `?topic=` (a problem key or a model key, resolved on the server), a prefilled subject, "What happens next" from `Site.next_steps` |
| `/privacy`, `/terms`   | A7        | Quiet typography with a sticky contents list, Mono effective/reviewed/version row and reading progress                                                                                                           |
| 404, error, loading    | A8        | 404 shows the maquette still, a Mono "no route" line and a command-palette hint; error never renders the message or digest; loading is a hairline bar over the archetype skeleton                                |

Shared: `LabSwitcher` (M28), `ReadingProgress` (M34), the highlight scope in the engine chapter bindings (`data-highlight-scope`, `data-highlights`, `data-highlight-id`), one page-styles file per slice. Registry: M17, M25, M28, M32 and M34 are built.

## 2. Acceptance

| Line                                                     | Result                                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Each page uses a template; no private header or CTA band | Header, CtaBand and `archetypes.json` (A3 and A4 now `detail`) agree; the probe runs on every public route in both themes                                                                  |
| Contact works with and without `?topic=`                 | Tested: problem key, model key, unknown key ignored and never reflected, the form payload unchanged                                                                                        |
| Diagrams readable without colour, with a text equivalent | State is a glyph, a word, stroke style and outline; every node and edge is in the "Diagram as text" list                                                                                   |
| Initial JavaScript                                       | **177.4 KB** gzip on every list page and the home (the home was 179.7; `/projects` and `/articles` were 188 to 191 and are gated no more); 170.6 KB on a case file, 168.4 KB on an article |
| Tests                                                    | 239 files / 1,681 tests pass; tsc and eslint clean                                                                                                                                         |
| Browser                                                  | 107 specs pass (section 3)                                                                                                                                                                 |

## 3. Browser evidence

On the production build against a seeded throwaway database (desktop and phone, both themes): the consistency probe on every public route (index, story, detail, narrative, conversation, document, system), the public-quality specs (landmarks, axe, overflow), the contact spec and the chrome-tone spec: 107 passed. Screenshots of every page were reviewed on desktop (the case-study diagram with chapter sync, the lab registry, the contact topic flow). Not run: the smoothness harness, Lighthouse, visual snapshots and the 3D hero specs.

## 4. Decisions made in this phase

- **Filters are server-rendered GET forms, not client components.** The three client discovery sections (about 2,000 lines) and `DiscoveryFilters` are deleted; the form always sends every field, so the pages redirect to the clean URL.
- **Route header copy was wrong for three pages** and is fixed: Projects is "The lab" (it said "Problems solved" with a case-study lede), Case studies is "Case files", Videos is "Recommended watching".
- **`/contact` reads `searchParams`, so it renders per request**; the page payload and the services stay cached.
- **No inner page pins.** Case-study chapter sync uses the focus binder, not a scene.

## 5. Not done

- **No engagement-type filter on `/case-studies`.** The discovery query has no such field; the type is a chip on every row. It needs a field in `src/lib/discovery/case-study-discovery.ts` and a filter in the case-study query.
- **M30 shared-element transition** (a row morphing into the case-file hero) is not built, nor the optional working-hours bar on Contact (C-33).
- **Edges that run both ways between the same two nodes overlap** in the case-study diagram, and edge labels are spread by fan-out but can still touch in a dense graph.
- Article rows have no thumbnail (a client component would break the zero-client goal); the article cover is greyscale.
- Lighthouse, the smoothness harness and the visual snapshots were not run.
- `src/app/error.tsx` and `src/app/global-error.tsx` (the root error views) still show the digest.
- The owner's database still has the old home composition; run `pnpm seed:dry-run` first.
