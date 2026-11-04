# Motion

The motion engine, the interaction primitives, the command palette, the route shutter, the smoothness harness and the Motion lab (plan Phase 2). The rules come from plan 3.7; this file records what exists and how to use it.

## The rule that shapes everything

The page is complete without the engine. The server HTML holds all content, nothing is hidden before JavaScript, and every effect has a reduced variant that renders the end frame. Motion is an enhancement that arrives late and can fail without anyone noticing.

## Who gets what

| Visitor                                                                              | Tier  | Engine (GSAP, ScrollTrigger, SplitText, Lenis) | What they get                                                                                                            |
| ------------------------------------------------------------------------------------ | ----- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Full motion, fine pointer, capable desktop                                           | T3    | Loaded after idle                              | Everything: smooth scroll, line reveals, count-ups, magnetic CTA, reticle cursor, pins, shutter                          |
| Full motion, fine pointer, smaller desktop                                           | T2    | Loaded after idle                              | The same without the pointer effects (magnetic, cursor, glass tilt)                                                      |
| Touch (any motion setting)                                                           | T2/T1 | **Absent**                                     | CSS reveals, the route shutter where View Transitions exist, the palette, the rail, plain scenes                         |
| Reduced or off motion (OS or site preference), Save-Data, low-memory, forced colours | T1/T0 | **Absent**                                     | The end frame of every effect. Reduced allows a 150 ms opacity fade where it helps comprehension; off has no transitions |
| No JavaScript                                                                        | T0    | Absent                                         | The complete server-rendered page                                                                                        |
| The engine chunk fails to load                                                       | T1    | Failed                                         | The page as the server rendered it; one privacy-safe `engine_load_failed` event                                          |

The decision is `resolveEnginePolicy` in `src/lib/motion/tier.ts` (pure, unit-tested). `?tier=0..3` forces a tier for QA and survives navigation for the session; `?tier=auto` clears it. The resolved state is on `<html>` as `data-tier` and `data-motion-engine` (`loading`, `ready`, `off`, `failed`).

Touch visitors never download the motion chunk. Phase 5 builds pinned scenes for phones as `position: sticky` plus IntersectionObserver beats, so they stay short and engine-free.

## Layers

```
MotionProvider        (root, shared with the admin)   preference, reduced, capability, visibility
  EngineProvider      (public surface only)            engine, status, tier
    PublicEnhancements (initial JS: a stub, ~0.5 KB)   waits for idle, listens for Ctrl/Cmd+K
      Enhancements    (deferred chunk)                 MotionEngineHost, RouteTransitions, ScrollRestoration, Cursor, palette, perf overlay
        engine        (motion chunk, dynamic import)   GSAP + ScrollTrigger + SplitText + Lenis + behaviours
```

- Only `src/lib/motion/engine/*` imports GSAP or Lenis. Components import the engine's types and receive the live engine from `useEngine()`.
- `tests/unit/bundle-boundary.test.ts` walks the import graph: nothing the admin or `components/ui` can reach touches the engine, the engine is imported dynamically by one file, and the public layout reaches it only through the deferred enhancements.
- The motion chunk budget is 60 KB gzip (`scripts/measure-motion-chunk.mjs`); it is measured in `docs/baseline/phase-2-findings.md`.

## Tokens

Single source `src/lib/motion/tokens.ts`, mirrored to `tokens.css` (a unit test keeps them equal). GSAP receives the same curves as functions (`easeFn`), so CSS and scripted motion share exactly one set.

| Token            | Value                             | Use                                   |
| ---------------- | --------------------------------- | ------------------------------------- |
| `dur.micro`      | 120 ms                            | Hover, press                          |
| `dur.fast`       | 200 ms                            | Toggles, chips                        |
| `dur.base`       | 360 ms                            | Reveals, panels                       |
| `dur.slow`       | 640 ms                            | Line reveals, wipes                   |
| `dur.scene`      | 1100 ms                           | Chapter entrances                     |
| `ease.signal`    | `cubic-bezier(0.16, 1, 0.3, 1)`   | Default entrance (expo-out feel)      |
| `ease.settle`    | `cubic-bezier(0.22, 0.8, 0.2, 1)` | Layout settle                         |
| `ease.snap`      | `cubic-bezier(0.7, 0, 0.2, 1)`    | Exits and wipes                       |
| `scrub.lag`      | 0.6 s                             | Scroll-linked smoothing               |
| `stagger.line`   | 80 ms                             | Headline lines                        |
| `routeShutterMs` | 420 ms                            | Route shutter (M18)                   |
| Stagger caps     | 80 ms step, 600 ms total, 12 max  | `staggerDelays`, `Reveal index/count` |

## Components

| Component                                          | Effect           | Needs the engine          | Without it                                                          |
| -------------------------------------------------- | ---------------- | ------------------------- | ------------------------------------------------------------------- |
| `Reveal` (server component) and `AnimationApplier` | M07, M08         | No (CSS and one observer) | Visible content                                                     |
| `TextReveal`                                       | M02              | Yes (SplitText)           | The plain text                                                      |
| `Counter`                                          | M10              | Yes                       | The final number                                                    |
| `Magnetic`                                         | M14              | Yes, tier 3               | A plain wrapper                                                     |
| `Cursor`                                           | M16              | Yes, tier 3               | Not rendered; the native cursor is never hidden                     |
| `TraceRail`                                        | M06              | No                        | Same (ticks, current mark; the moving fill is hidden under reduced) |
| `PinScene`, `PinBeat`                              | pins (3.7.4)     | Yes                       | The beats stack as a plain list in reading order                    |
| `RouteTransitions`                                 | M18              | No (View Transitions)     | The page-enter preset: an 8 px, 360 ms ease-in on a settled `main`  |
| `ScrollRestoration`                                | back and forward | No (uses it when present) | Same; the position is restored without smooth scroll too            |
| `CommandPalette`                                   | M20              | No                        | Same                                                                |
| `MotionPreferences` (footer)                       | preferences      | No                        | Same                                                                |

Usage:

```tsx
<Reveal index={i} count={items.length}>…</Reveal>      // staggered, capped at 600 ms
<Reveal variant="wipe"><img … /></Reveal>               // media wipe; the image is decoded first
<TextReveal as="h2" className="t-h2">A plain-text headline</TextReveal>
<Counter value={1280} suffix="+" />                      // verified or derived figures only
<Magnetic><Button>Describe your problem</Button></Magnetic>
<PinScene beats={3} length={240}><PinBeat index={0}>…</PinBeat>…</PinScene>
<TraceRail items={[{ id: "triage", label: "Triage" }]} />
```

Rules the components enforce:

- The first screen is never hidden or replayed: `AnimationApplier` measures a batch once (one layout), leaves on-screen blocks alone and gives only below-the-fold blocks a start pose. `TextReveal` and `Counter` skip text that starts in view.
- Reveals rise 16 px or less and use opacity and transform only. The media wipe is a cover panel that retracts (a transform); it is not a clip-path, because an observer treats a fully clipped element as never intersecting. Use it on a wrapper around the media.
- A pinned scene is capped at 300 vh and is CSS `position: sticky` in a taller track, with ScrollTrigger only reading progress. A ScrollTrigger fixed-position pin was measured at a 0.95 layout shift each time a pin starts and ends (the browser sees the element leave one coordinate space for another), which would sink the CLS budget with three pins on Home. Inactive beats are `inert` while pinned. Every pin needs a "Skip" link to the next chapter, and the palette jumps past pins; the reduced layout is the accessible alternative.
- Pointer effects subscribe to the engine's single pointer source (one passive listener, delivered on the GSAP tick). A component test proves a pointer sequence causes no React render (rule F3).

## Smooth scroll and anchors

Lenis runs only with full motion and a fine pointer, advanced from the GSAP ticker (one clock) with `lagSmoothing(0)`; ScrollTrigger follows Lenis. Native scroll position is never replaced, so find-in-page, keyboard scrolling and back and forward work. Same-page hash links scroll with the header offset (`scroll-padding-top`), update the URL, and move focus to the target. Overlays that lock scroll (`body { overflow: hidden }`, as `useDialogFocus` does) stop Lenis. Scrollable children inside overlays carry `data-lenis-prevent`.

## Route shutter and page enter

With full motion and View Transitions, a plain click on an internal link to another page runs the navigation inside `document.startViewTransition`. The header persists (`view-transition-name: site-chrome`) and the new page wipes in over 420 ms with `ease.snap`. The click is intercepted in the capture phase (`resolveTransitionTarget` leaves modified clicks, new tabs, downloads, files, the admin, the API and same-page links alone); `next/link` still handles prefetching, history and scroll restoration. Without View Transitions, and for reduced motion, the settled `main` eases in (or simply appears). A skeleton never animates.

The plan's option of `experimental.viewTransition` was not taken: it switches the app to a different React channel for one effect. The manual wrapper is feature-detected, has a 1.5 s safety timeout and falls back to the CSS preset.

## Command palette

`Ctrl/Cmd + K` or the header search button. A modal dialog with a combobox (focus stays in the input, `aria-activedescendant` follows the arrow keys, Enter runs, Escape closes and focus returns), a grouped listbox, and a polite result count. Commands come from the published site's navigation plus theme, motion and 3D-scene preferences (`buildPaletteCommands`). The highlighted page is prefetched. The shortcut listener is in the initial bundle; the palette itself is a deferred chunk fetched at idle.

## Preferences

Motion: Auto (site default), Full, Reduced, Off. 3D scene: Live or Still. Both are in the footer and the palette, persist in localStorage, and the OS reduced-motion setting always caps motion at reduced. The scene choice is `data-scene` on `<html>`; the scene itself arrives in Phase 3.

## Smoothness harness

`tests/e2e/support/frame-sampler.ts` samples `requestAnimationFrame` intervals, long animation frames, layout shift and interaction latency inside the page; `scriptedRun` scrolls down for 5 s (mouse wheel on desktop so Lenis is exercised, touch gestures on mobile), hovers six controls, clicks the theme toggle twice and scrolls back up; the maths and budgets are in `tests/helpers/frame-stats.ts` and unit-tested. `tests/e2e/smoothness.spec.ts` judges the median of three runs on `/`, `/about`, `/projects` and `/lab/motion`, and re-runs a failing route under Chromium tracing and attaches the trace. `tests/e2e/harness.spec.ts` proves the gate can fail: a smooth page passes and a page that burns 80 ms every fourth frame fails with the right reasons.

| Profile                        | p95 frame | Dropped frames | Long animation frames | Layout shift | Interaction p75 |
| ------------------------------ | --------- | -------------- | --------------------- | ------------ | --------------- |
| Desktop 1440 wide, no throttle | 18 ms     | 2 %            | 2                     | 0.05         | 100 ms          |
| Constrained mobile, 4x CPU, T2 | 33 ms     | 8 %            | not gated             | 0.05         | 100 ms          |

Run it against a production build (`pnpm build`, then `MOTION_LAB=1 pnpm start -p 3107`, then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3107 pnpm exec playwright test tests/e2e/smoothness.spec.ts`). The dev server's numbers describe the dev server. CI runs it in the `smoothness` job.

## Smoothness rules and how each is enforced

| Rule | Enforced by                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| F1   | Only transform, opacity and clip-path animate in `engine.css` and the behaviours; code review                |
| F2   | Geometry measured once and on refresh (`magnetic`, `AnimationApplier` batches); harness long-frame count     |
| F3   | Component test: a pointer sequence causes no render; no `pointermove` listener in a component                |
| F4   | `?debug=perf` overlay shows promoted layers; `will-change` only on registered reveals                        |
| F5   | Not yet: `content-visibility` for long static sections arrives with the Home chapters (Phase 5)              |
| F6   | Layout reserved before motion; counters lock their width; harness layout-shift budget                        |
| F7   | The wipe waits for `img.decode()`; unit test                                                                 |
| F8   | Engine start is deferred to idle; SplitText waits for fonts; harness long-frame count                        |
| F9   | Every behaviour returns a cleanup and components clean up on unmount; e2e navigates mid-animation            |
| F10  | One debounced refresh on fonts, load, document height changes and pinned media (`scroll.ts`)                 |
| F11  | The GSAP ticker follows `requestAnimationFrame`, which pauses in hidden tabs                                 |
| F12  | Phase 3 (3D)                                                                                                 |
| F13  | `MotionEngineHost` catches a failed load, flips to the CSS tier and reports one event; unit and e2e coverage |

## The Motion lab

Live demos run for real at `/lab/motion` on the public surface (dev always; a production build with `MOTION_LAB=1`, otherwise 404 and `noindex`). They cannot live inside the admin because no animation library may be imported from the admin. The System lab's Motion section holds the tokens, the easing curves drawn from the shared functions, and this registry, and links there. Every built effect has a demo section carrying its registry entry; a unit test keeps them in step.

## Adding an effect

1. Add it to `src/lib/motion/registry.ts`: trigger, meaning, tokens, tier behaviour and the reduced variant. `pnpm exec tsx scripts/motion-registry-doc.ts --write` refreshes the tables below.
2. Build it on the tokens: only transform, opacity and clip-path, a cleanup for every setup, nothing hidden before JavaScript.
3. Add its demo to the Motion lab and its id to `LAB_DEMO_IDS`.
4. Cover the reduced and no-engine paths in a component test.

## Effect registry

Generated from `src/lib/motion/registry.ts`. Do not edit by hand.

<!-- registry:start -->

**Public effects** (tier columns are T3 / T2 / T1: `run` scripted, `css` the CSS-only variant, `—` not run)

| ID | Effect | Trigger | Meaning | Timing | T3 / T2 / T1 | Reduced or off | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | Grid draw | Load (hero) | assemble | scene, signal | run / run / css | Instant, final grid | Built |
| M02 | Line settle | Load, in-view | resolve | slow, signal, stagger.line | run / run / css | Instant | Built |
| M03 | Topology in | Load (after idle) | assemble | scene, settle | run / run / — | Poster only | Built |
| M04 | Camera dolly | Scroll scrub (hero 120vh) | transmit | scrub.lag | run / run / — | Fixed still camera | Built |
| M05 | Pointer depth | Pointer move | respond | fast, lerp | run / — / css | None | Built |
| M06 | Signal rail | Scroll progress | transmit | scrub.lag | run / run / run | Static ticks, active tick only | Built |
| M07 | Reveal rise | In-view | resolve | base, signal | run / run / css | Opacity 150 ms or instant | Built |
| M08 | Media wipe | In-view | resolve | slow, snap | run / run / css | Instant | Built |
| M09 | Label decode | In-view (first time) | resolve | base, 24 characters or fewer | run / run / — | Instant text | Phase 5 |
| M10 | Count-up | In-view (verified or derived numerics) | resolve | slow, settle | run / run / — | Final number | Built |
| M11 | Stack explode | Pinned scrub (about 250vh) | assemble | scrub.lag | run / run / — | Static panels, all specs shown | Phase 5 |
| M12 | Pipeline trace | Pinned scrub (about 300vh) | transmit | scrub.lag | run / run / — | Static diagram, failure line shown | Phase 5 |
| M13 | Problem expand | Click, Enter, in-view | transmit | base, settle | run / run / run | Instant expand | Phase 5 |
| M14 | Magnetic CTA | Pointer near | respond | fast, spring | run / — / — | None | Built |
| M15 | Sheen | Pointer over glass | respond | micro | run / — / — | Static edge highlight | Phase 5 |
| M16 | Reticle cursor | Pointer (fine) | respond | lag 120 ms | run / — / — | Native cursor only | Built |
| M17 | Chapter sync | Scroll (case file) | assemble | scrub.lag | run / run / — | All nodes visible, no highlight | Phase 6 |
| M18 | Route shutter | Navigation | assemble | 420 ms, snap | run / run / — | Instant or crossfade 150 ms | Built |
| M19 | Wire draw | Scroll (process, timeline) | assemble | scrub.lag | run / run / — | Complete wire | Phase 5 |
| M20 | Palette open | Command-K or button | respond | fast, signal | run / run / run | Instant | Built |
| M21 | Theme flip | Toggle | respond | 480 ms circular reveal | run / run / — | Instant swap | Built |
| M22 | Footer wordmark | Scroll into footer | resolve | scrub.lag | run / run / — | Static wordmark | Built |
| M23 | Velocity coupling | Scroll velocity | transmit | damped, skew 3 degrees at most | run / — / — | None | Built |
| M24 | Boundary wipe | Scroll (tone change) | assemble | scrub.lag, 30vh | run / run / — | Instant tone change | Phase 5 |
| M25 | Frame parallax | Scroll (media frames) | assemble | scrub.lag, 8% travel | run / run / — | Static image | Phase 6 |
| M26 | Underline draw | Hover, focus | respond | fast, signal | run / run / run | Instant underline | Built |
| M27 | Label roll | Hover, press, loading | respond | micro, press 50 ms | run / — / — | Colour-free state swap, no roll | Built |
| M28 | Nav indicator | Route or hover change | respond | base, settle | run / run / run | Instant | Built |
| M29 | Glass tilt | Pointer over featured glass | respond | spring, 3 degrees at most | run / — / — | None | Phase 5 |
| M30 | Shared-element morph | Navigation | assemble | 420 ms, snap | run / run / — | Instant or crossfade | Phase 6 |
| M31 | Path draw | Scroll, in-view | transmit | scrub.lag or slow | run / run / — | Complete path | Phase 5 |
| M32 | Field focus | Focus, valid, invalid | respond | fast | run / run / run | Instant | Phase 6 |
| M33 | Skeleton breathe | Loading | resolve | 1.4 s loop | run / run / run | Static skeleton | Built |
| M34 | Reading progress | Scroll (articles, case files) | transmit | linear | run / run / run | Static or hidden | Phase 6 |
| M35 | Header hide and show | Scroll direction and speed | respond | base, snap | run / run / run | Header always visible | Built |
| M36 | Role story | Scroll scrub (hero pin, about 300vh) | resolve | scrub.lag, hold 0.7, change 0.3 | run / run / run | Roles stacked as a plain list | Built |
| M37 | Scene reaction | Scroll (hero pin) | assemble | camera glide, eased | run / run / — | Poster still | Built |
| M38 | Triage focus | Scroll (each pain in view) | resolve | 600 to 700 ms, signal | run / run / run | All pains fully visible | Phase 5 |
| M39 | Switch-off flip | Scroll (end of pipeline) | transmit | fast | run / run / — | Static "Off" state with the sentence | Phase 5 |

**Console effects** (calm preset, CSS only, no tiers)

| ID | Effect | Trigger | Timing | Reduced or off | Status |
| --- | --- | --- | --- | --- | --- |
| C01 | State transitions | Hover, focus, select | 100 to 160 ms | Instant | Phase 7 |
| C02 | Route content fade | Navigation | 150 ms | Instant | Phase 7 |
| C03 | List insert and remove | Data change | 180 ms (FLIP) | Instant | Phase 7 |
| C04 | Toast | Mutation result | 160 ms in | Instant | Phase 7 |
| C05 | Skeleton breathe | Loading | 1.4 s loop | Static | Phase 7 |
| C06 | Sidebar collapse | Toggle | 160 ms | Instant | Phase 7 |
| C07 | Dialog, drawer, palette | Open, close | 160 ms | Instant | Phase 7 |

<!-- registry:end -->
