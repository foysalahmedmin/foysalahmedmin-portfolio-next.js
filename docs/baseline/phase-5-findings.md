# Phase 5 findings: the home chapters (2026-11-08)

Plan section 4.1 and Phase 5 (section 7). Evidence for the acceptance lines; what was measured is separated from what was not.

## 1. What was built

All sixteen chapters render from the Page composition and the Site data, server-rendered, with no new client component on the home route.

| Chapter                                | Where                                                                    | Notes                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Evidence strip                         | `metrics-strip-section` layout `evidence`                                | Hides below three qualifying metrics; native `popover` for "how this was measured"; plain numbers (no count-up, see section 4) |
| Triage                                 | `triage-section`                                                         | Scroll-linked through `data-scroll-focus`; `:focus-within` gives keyboard users the same state                                 |
| Stack                                  | `services-section/stack.tsx`                                             | Pinned, 170 svh, three tilted glass slabs, leader lines and specs, all from `--pin-progress`                                   |
| Pipeline                               | `architecture-workflow-section/pipeline.tsx`                             | Pinned, 300 svh, one beat per node; pulse, lit nodes, failure line, switch that flips Off; data is `Site.workflow_example`     |
| Case files, Deliverables               | `case-studies-section/files.tsx`, `deliverable-samples-section`          | Deliverables is a radio-driven document viewer with no JavaScript                                                              |
| Process wire, Engagement               | `process-steps-section/wire.tsx`, `engagement-models-section`            | Paper band; the wire draws with `--progress`; a real `<table>`, stacked by CSS on small screens                                |
| Registry, Commitments, Notes, FAQ, CTA | `skills-section/registry.tsx`, `commitments-section`, `articles-section` | CTA band gains "what happens after you write" from `Site.next_steps`, on the home only                                         |
| Tier 2: Fit check, Finder, How I think | `fit-check-section`, `starting-point-section`, `commitments-section`     | Off in the seed; the finder is one lazy client island computed in the browser (works offline, tested)                          |

Engine: `src/lib/motion/engine/chapters.ts` binds `data-scroll-focus` and `data-scroll-progress` for every chapter. It lives in the deferred motion chunk, so the chapters add nothing to the initial scripts. Registry: M11, M12, M19, M31, M38 and M39 are built (demo route `/`). Every pinned scene has a skip link before it and an anchor after it (hero, Stack, Pipeline).

## 2. Acceptance

| Line                                                  | Result                                                                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard path and reduced parity for every section    | Tested in `tests/e2e/home-chapters.spec.ts` (reduced motion: no pins, nothing dimmed, every wire finished) and in the component tests           |
| At most three pins, each one screen or less per beat  | Three (hero, Stack, Pipeline), asserted; each has a skip link, asserted                                                                         |
| Home length                                           | **22.8 screens** on the seeded home at 1440x900 (limit 24); **27.0** with all three tier-2 chapters on (limit 27), measured on the chapters lab |
| Initial JS                                            | **179.705 KB** gzip, 302 bytes under 180 KB (Phase 4: 28 bytes)                                                                                 |
| No hover-only information                             | The case-file preview is an enhancement; the same facts are in the row                                                                          |
| Evidence strip hides itself under three metrics       | Unit test                                                                                                                                       |
| Tier 2 can be switched on without a deploy            | Section visibility is page data; the finder and fit check render as soon as the Site field is enabled and published                             |
| The finder works with the network off                 | `home-chapters.spec.ts` answers the questions offline                                                                                           |
| Tests                                                 | 232 files / 1,565 tests pass; tsc and eslint clean; build passes; 20 chapter specs and the existing public specs pass on desktop and phone      |
| Lighthouse (>= 90 / a11y >= 95), CLS <= 0.05, harness | **Not re-run in this phase** (see section 5)                                                                                                    |

## 3. Decisions made in this phase

- **Section sub-lines are fixed copy in the components** (a constant at the top of each file, from the plan's copy deck); no `subheading` field was added.
- **`pillars` is off on the home** (`visible: false`, one switch in the Pages editor). The hero and the Stack already present the same three roles, and with it on the seeded home was 25.6 screens. Seed v8 was edited in place: it has not been applied outside throwaway databases.
- **The FAQ stays the centred accordion** the owner approved; the plan's question/answer split is not built.
- **The card-row process layout and its client `Rail` are retired.** Nothing in the seed used them, and keeping the import cost every public route about 600 bytes of initial JS. Any stored Page that still names `numbered` or `default` renders the wire.
- **The first hero role is complete at the top of the page** (owner request, 2026-11-08): its plain line and its three capabilities are visible before any scroll. The other two roles still arrive with the scroll.
- **Triage dims the sentence only** (50 %), not the labels, so small text keeps AA contrast (axe found the first version at 2.8:1).

## 4. Defects found and fixed

1. A `ScrollTrigger` on the CTA wire made ScrollTrigger refresh the page when the engine loaded, which left a visitor who had scrolled far on `/about` stuck partway (`chrome-tone.spec` caught it). Chapter progress now reads the element's box once per frame while it is near the screen, with no ScrollTrigger and no refresh.
2. The initial-JS cap was exceeded by 302 bytes (Rail and the finder loader). `next/dynamic` in a server component did **not** help (it made it worse by 158 bytes); removing the dead `Rail` did.
3. Triage dimming and the group label failed axe color-contrast (see above).
4. The chapter rail listed every section with an id and cut the list at ten; it now lists the sections that mark themselves `data-chapter`.
5. The first-version spec raced the engine's trigger refresh; it now waits for a steady page height.

## 5. Not done, not measured

- **Lighthouse, the smoothness harness and the visual snapshots were not run.** No new motion library code was added; the motion chunk grew by the chapter bindings only, and `chapters.ts` no longer imports GSAP. Both should run once before Phase 6.
- **Skipped motion:** M09 label decode, M13 problem expand (click), M15 sheen, M24 boundary wipe, M29 glass tilt, the M30 morph, and the digit roll on the evidence strip (`Counter` is a client module the home would have to ship). Phase 9 can add them behind the engine.
- **The 3D hero canvas specs and the axe/trace-heavy specs flake when run four at a time on a software renderer** (the trace zip is corrupted under load); each passes alone.
- `/articles` is 191.3 KB initial JS (it was gated into Phase 6 at 188 to 190 KB).
- The owner's own database still has the old home composition; `pnpm seed:dry-run` first.
- The finder's `finder_complete` event is not sent: the repo has no general event helper, and the plan says nothing is sent.
- `/contact?topic=` and `start=` are linked but not read (Phase 6).
- FAQPage JSON-LD is not emitted (Phase 6 or 9).
