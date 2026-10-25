# Phase 3 findings: shell, hero and 3D

Measured on 2026-10-26 against a production build (`pnpm build && pnpm start -p 3107`) on a throwaway local database, with the Phase 2 build (`e5b2b2b`) started beside it for like-for-like comparison. Raw numbers: [`phase-3-results.json`](./phase-3-results.json) (constrained and desktop profiles, final build).

## 1. Acceptance

| Plan line                                     | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas pauses off screen and unmounts         | **Met.** Paused on leaving the hero, released after four seconds (canvas removed, GPU memory returned), recreated on return. Covered by `hero.spec.ts`.                                                                                                                                                                                                                                                                                                                       |
| T0 and T1 render the poster only              | **Met.** `?tier=0` and `?tier=1`: no canvas, no Three.js response, roles stacked. Also for reduced motion.                                                                                                                                                                                                                                                                                                                                                                    |
| No-JS shows complete hero content             | **Met in the server HTML, not in the browser.** The hero is complete and in reading order in the HTML (asserted by `hero.spec.ts`). A visitor with JavaScript off sees the skeleton on every public route, because the finished page sits in a hidden Suspense segment that an inline script moves into place (the `loading.tsx` boundary). That is site-wide and older than this phase; see section 6.                                                                       |
| Glass contrast sampling green over the canvas | **Met.** The worst one percent of pixels behind the header meets 4.5:1 over the live scene, both themes (`hero.spec.ts`), and axe is clean with the canvas live.                                                                                                                                                                                                                                                                                                              |
| Hero story works without WebGL                | **Met.** Under a software renderer the probe lowers the tier to 1 after the engine has loaded; the same three beats play over the poster.                                                                                                                                                                                                                                                                                                                                     |
| Harness green on Home                         | **Met.** The harness passes on all eight routes and profiles. Home, desktop: p95 16.7 ms, dropped 1.64 %, one long frame, CLS 0, INP 48 ms; constrained (4x CPU, touch): p95 16.8 ms, dropped 1.26 %, CLS 0, INP 88 ms. With the live canvas on a real GPU (opt-in `hero-gpu.spec.ts`, Apple M2): desktop p95 16.7 ms, dropped 0.33 %, one long frame (budget two); phone profile (4x CPU, simplified scene) p95 16.8 ms, dropped 0.66 %, one 117 ms frame at scene creation. |
| Chunk sizes                                   | **Met.** 3D chunk 138.0 KB gzip (budget 170); motion chunk 53.9 KB (budget 60); neither is in any route's initial scripts; admin and `components/ui` cannot reach either (unit-tested).                                                                                                                                                                                                                                                                                       |
| Initial JS at most 180 KB                     | **Met, by 46 bytes.** Home family 179.96 KB gzip (Phase 2: 176.5). `/projects` 193.7 and `/articles` 191.5 stay over and gated into Phase 6. There is no headroom left: Phase 5 has to bring any client code for the home chapters in behind dynamic imports.                                                                                                                                                                                                                 |
| LCP at most 2.5 s (constrained)               | **Met.** Home 1,244 ms (Phase 2 on the same data: 1,132), About 1,056 (936), Projects 988 (948).                                                                                                                                                                                                                                                                                                                                                                              |
| CLS at most 0.05                              | **Met.** Home 0.012 in Lighthouse (Phase 2: 0), 0 in the harness. The shift is the hero title settling when the display face loads.                                                                                                                                                                                                                                                                                                                                           |
| TBT at most 200 ms (constrained)              | **Met.** Home 118 ms, About 71, Projects 19, Contact 16 (five-run medians, 4x CPU, 150 ms RTT, 1.6 Mbps). Phase 2 on the same data: 735, 108, 180 and 23. See section 5.                                                                                                                                                                                                                                                                                                      |

## 2. What was built

- Story clock: N beats, each holds 0.7 and changes over 0.3. The pin writes `--pin-position` and `data-beat`; the CSS formulas and the 3D camera read the same clock.
- Public shell: header (hides on a fast scroll down, returns on upward intent, one sliding nav indicator, theme flip as a circular reveal, palette, primary action), footer wordmark, chapter rail, mobile action bar, scroll to top.
- 3D maquette in vanilla Three.js (21 draw calls, 36.6k triangles on desktop; 17 and 34.4k portrait): scene, materials, camera rig, labels, packets of light on every conduit, frame loop. One dynamic importer, loaded only after the engine settles and only when the tier, the GPU probe and both kill switches (`PUBLIC_3D_ENABLED`, site motion `off`) allow it.
- Poster pipeline: `scripts/render-hero-poster.ts` renders both themes and both orientations from the same scene (60 KB portrait, 120 KB landscape budgets, greyscale-scanned in a unit test).
- Hero as the three-role scroll story; the old carousel hero and the autoplay code are gone.
- Hero art renamed after the three roles in one folder (`public/images/hero/`); the evidence manifests and the byte-identical mirror policy follow.
- Home sections rebuilt on one head and three layouts (stacked panels, card row with arrows, centred accordion), a flow diagram with a travelling pulse and current, a GitHub contribution dot calendar pinned to the page's end, a tinted light theme with white cards, and no numbers in any card.

## 3. What the browser and the tests caught

1. **The hero scene had no height on a real GPU.** In the pinned state the backdrop is absolutely placed inside a one-cell grid and its start alignment shrank it to its (absolute) content: 0 px. The canvas and the poster inside it had no box. Software-rendered runs only checked state attributes and never noticed. `hero.spec.ts` now asserts that both fill the first screen.
2. **Releasing the scene demoted the session.** Disposing the renderer loses its WebGL context on purpose; the handler treated that as a failure, so scrolling back never recreated the canvas. It now ignores a loss caused by disposal, and a context that is lost while live is cancelled so the browser can restore it, falling back to the poster only after three seconds.
3. **The poster stayed under the live scene.** The camera moves and the poster does not, so the system showed twice at different sizes. The poster fades out once the scene is drawing.
4. **The header never picked up the tone of a band that streamed in after mount.** The controller measured once. It now sets up again when the set of bands changes.
5. **The footer name was cut off at the bottom of the page.** Its rise animation ended at 55 % of the element's cover range, which the end of the page never reaches. It now finishes by the time the name is fully on screen.
6. **The footer wordmark failed contrast although aria-hidden.** It is decoration (WCAG 1.4.3 incidental text) and is now drawn from a data attribute.
7. **The poster was the largest paint and was lazy.** LCP on the constrained profile was 2,416 ms. The default-theme poster is now eager with high fetch priority: 1,136 ms, equal to Phase 2.
8. **Several effects each forced a full layout at mount** (section 5): Home TBT 735 ms in Phase 2 and 1,583 ms at the first Phase 3 build, 118 ms now.
9. **Hover scale and view-timeline reveals needed `html[data-motion="full"]`.** Everything motion-only in `sections.css` is gated on it, so reduced and off motion render the end state.

## 4. Bundles

| Route                                 | Initial JS, gzip | Phase 2  |
| ------------------------------------- | ---------------- | -------- |
| `/`, `/about`, `/contact`, `/privacy` | 179.96 KB        | 176.5 KB |
| `/projects`                           | 193.7 KB         | 190.2 KB |
| `/articles`                           | 191.5 KB         | 188.0 KB |

The 3.5 KB is the shell (header hooks, mobile bar, chapter rail, theme flip, the frame batch), the hero's client shell and the card row. The 3D scene (138.0 KB gzip) and the motion engine (53.9 KB) are in no route's initial scripts.

## 5. Load and blocking time

All numbers here are from one production build per phase run against the **same database**, which holds the full launch content (six projects, six articles, four case studies, seven videos, services, FAQs). That is heavier than the demo data the Phase 2 numbers were taken on (Home TBT 129 to 165 ms there), so the Phase 2 column below is Phase 2 re-measured on this data. Constrained mobile profile (4x CPU, 150 ms RTT, 1.6 Mbps), five-run medians:

| Route                                     | LCP Phase 2 to 3  | TBT Phase 2 to 3  |
| ----------------------------------------- | ----------------- | ----------------- |
| `/`                                       | 1,132 to 1,244 ms | 735 to **118** ms |
| `/about` (Phase 3 has many more sections) | 936 to 1,056 ms   | 108 to **71** ms  |
| `/projects`                               | 948 to 988 ms     | 180 to **19** ms  |
| `/contact`                                | 944 to 984 ms     | 23 to **16** ms   |

Lighthouse default mobile (simulated slow 4G, 4x CPU), Home, three runs: performance 83 (Phase 2: 60), TBT 154 ms (1,624), LCP 4,236 ms (4,106), CLS 0.012 (0).

**What it was.** A first look blamed the hero and the scene. A CPU profile under the constrained profile showed otherwise: the blocking time was the page being laid out again and again at mount. Several effects read layout (`window.scrollY`, `getBoundingClientRect`, `scrollHeight`, `offsetLeft`) right after other effects had written to the DOM, and each read made the browser lay the whole page out on the spot: the chrome tone controller, the trace rail, the nav indicator, the header's hide hook, the card row, the video player and the scroll-to-top hook. Home paid for four to six full layouts, about 350 ms each at 4x.

**What fixed it.**

- `src/lib/dom/frame-batch.ts`: `measureThenMutate(read, write)` runs every read of a frame before any write, so the page is laid out once. The tone controller, trace rail, nav indicator, header hide, mobile bar and card row use it for their first measurement; scrolling and hovering read directly (the layout is clean then).
- The video player takes its size from its ResizeObserver instead of a read at mount; the scroll-to-top button no longer reads the page's height on every scroll frame (and its three-state hook is gone).
- The GitHub dots had a scroll timeline and a style attribute per dot (371 of them). They are now one animation on the grid and no style attributes: Home frame budget went from failing (constrained p95 50 ms) to passing.
- The tone controller skips rebuilding its observers when nothing it depends on changed (a load or resize used to rebuild them).

**Tried and not kept.** `content-visibility: auto` on the lower sections took Home TBT to 35 ms but moved the cost into scrolling (dropped frames 1.5 to 4 % in the harness), and was unnecessary once the forced layouts were gone.

## 6. Decisions made while building

- **Poster and canvas share one framing** (virtual 16:9 and 9:16 frames cropped like `object-fit: cover`), so the poster can fade out with no jump. The posters are static files in `public/images/hero/`, not Managed Media: the hero must render when the database does not. Say so if the plan's "ingest through ManagedMedia" should win instead.
- **Hero art kept, renamed by role.** `frontend` and `backend` are kept as `software-developer-frontend` and `-backend`; the Software Developer role absorbed those lanes.
- **The GitHub calendar comes from a public mirror** read on the server and cached for six hours, because GitHub only serves the calendar to a signed-in client or to a token. If the mirror is down the section is the profile link alone. Replace it with the GraphQL API and a token when the owner wants to; nothing else changes.
- **The open-code section is the last chapter**, whatever order the page document lists it in, just above the contact band that closes every page (the consistency spec requires the band to be last).
- **The no-JavaScript skeleton is a routing decision**, not a hero one: either drop `loading.tsx` on the static routes (their content is prerendered anyway) or move to partial prerendering. Phase 9.
- **Software renderers get the poster.** CI and headless runs report SwiftShader, so they exercise the poster path; the canvas path is exercised by `?tier=3` (software) and by the opt-in GPU spec.

## 6a. Owner review round (2026-10-26)

After looking at the build in a browser the owner asked for the following; all of it is in the branch and verified against a throwaway database, none of it has been applied to the owner's own database.

- **About and the home introduction are one column**: a short title, the statement as the lead, the three roles' art as a wide band (a portrait when the Site has one), the three areas, then the process. The picture is no longer a small image beside a long column of text.
- **The closing contact band is one centred column** (heading, one line, the action and the email). It was a huge heading on one side and a button on the other.
- **Videos and Case studies are in the header and footer** even when the Site document predates them (`getPublicShellLinks`); a link the owner turned off stays off.
- **Projects without a picture get the drawing of their role** (system blueprint, application window, automation flow): one 4:3 monochrome frame, so a list reads as a set. The old fallback was coloured.
- **Evidence sections with nothing in them are left out** of a public page (timeline, credentials, testimonials, FAQ); "no testimonials are published yet" was a note for the owner.
- **About gains sections**: the role panels, services, the flow diagram, selected work, case studies and the open-code section are allowed on the About route and added to the seed draft and to `scripts/launch-content.ts` (additive, once, existing sections untouched). The GitHub section sits just above the closing contact band, because the consistency spec requires that band to be last.
- **Three 3-second clips** of the live hero (1280x720 H.264 with posters) are in `seed-assets/videos/`. A video of type `upload` needs a Managed Media file and the media provider is a real service, so they are not in any database; the readme says how to publish them.

What is still the owner's: running `scripts/launch-content.ts` against their own database (it publishes the Site, the About page and the content in one run and is safe to repeat), and the facts the timeline and credentials need (employers, dates, certificates, quotes). Those sections stay out of the page until they exist; nothing was invented.

## 7. Not done in Phase 3 (by design)

The clean-checkout CI simulation was not repeated for this phase (typecheck, lint, `pnpm test` against a replica set, the production build and the browser specs all ran in the working checkout, and a clean worktree was typechecked and built before the push). The home chapters of Phase 5 (this phase restyled the sections that exist and added the flow and GitHub ones); the data model additions and seed v8 (Phase 4); the console (7 and 8); M09 kicker decode (skipped), M15 (moved to 5).

## 8. Reproduce

```
pnpm build && pnpm start -p 3107
node scripts/measure-baseline.mjs http://127.0.0.1:3107 out.json
node scripts/measure-initial-js.mjs / /about /projects
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3107 pnpm exec playwright test tests/e2e/hero.spec.ts tests/e2e/sections.spec.ts --project=chromium-desktop --project=chromium-mobile
PLAYWRIGHT_GPU=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3107 pnpm exec playwright test tests/e2e/hero-gpu.spec.ts --project=chromium-desktop --project=chromium-mobile
pnpm exec tsx scripts/render-hero-poster.ts --base http://127.0.0.1:3107
```
