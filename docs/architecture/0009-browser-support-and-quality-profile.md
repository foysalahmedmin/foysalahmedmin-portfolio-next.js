# ADR 0009: Browser support, runtime target, and quality profile

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Product owner and repository maintainer
- **Supersedes:** Undefined browser/device and performance assumptions

## Context

Parallax, responsive admin UI, image optimization, and accessibility cannot be judged against an unspecified device. The installed Next.js 16.1.1 baseline supports modern browsers, while the product promise requires stronger, repeatable coverage.

## Decision

### Runtime and deployment baseline

Use pnpm with the committed lockfile and Vercel Node.js `24.x`; the repository will pin both Node major and package-manager version during the quality-foundation milestone. API, database, storage, image processing, migration, and job code run in Node, not Edge. Production uses the topology in ADR 0007.

### Supported browsers

At each release, support the latest two stable desktop releases of Chrome, Edge, Firefox, and Safari; current and previous-major iOS Safari; and current Android Chrome. The framework floor is Chrome/Edge/Firefox 111 and Safari 16.4, but a release is not considered supported merely because it meets that floor. Internet Explorer, legacy Edge, embedded in-app browsers, and browsers below the framework floor receive no compatibility guarantee.

Public navigation, identity, primary copy, projects/articles, and contact information remain readable from server HTML when JavaScript fails. Filters, admin, forms, hero controls, and enhanced motion require JavaScript and must expose honest unavailable/error states. CSS/JS features use capability queries and progressive enhancement; unsupported parallax/view-transition behavior falls back to the complete static layout.

`prefers-reduced-motion: reduce` disables autoplay, parallax, marquee, magnetic effects, smooth scrolling, count-up, and nonessential transforms. Content/order/actions remain identical. Keyboard, touch, pointer, zoom, high contrast/forced colors where available, light/dark, LTR, and safe-area/mobile-browser-chrome behavior are part of support.

### Automated and manual matrix

The pinned Playwright release owns CI Chromium, Firefox, and WebKit binaries. Run key public/admin journeys at 360×800, 768×1024, 1280×800, and 1536×960 in light/dark and normal/reduced motion where relevant. Playwright WebKit is an early regression signal, not a claim of real Safari equivalence; release smoke tests include current macOS Safari and real current/previous-major iOS Safari. One physical current Android Chrome device, preferably a mid-tier device, validates touch, scrolling, thermal behavior, and browser chrome.

The repeatable constrained profile is 360×800 CSS px, DPR 2, touch/mobile, 4× CPU slowdown, 150 ms RTT, 1.6 Mbps downstream, and 750 Kbps upstream. The scripted 10-second scroll visits hero, pillar narrative, case-study media, and footer without synthetic pauses. Desktop profiling uses 1440×900 with no artificial CPU/network throttle. Exact Chrome, Lighthouse, axe, Playwright, OS/device, fixture seed version, and run date are captured with every baseline artifact.

Cold and warm cache runs are recorded separately. Lighthouse gates use the median of three production-build runs on Home, About, Projects, Articles, and one representative detail page. Test fixtures are deterministic and production-shaped; third-party GitHub/map/provider failure is also exercised.

### Release quality targets

- Lighthouse Performance at least 90 and Accessibility at least 95 on the defined routes/profile.
- Zero automated critical/serious axe findings, plus manual keyboard and screen-reader smoke tests.
- Public initial-route JavaScript at most 180 KB gzip and third-party JavaScript at most 60 KB gzip.
- Mobile hero at most 200 KB; desktop hero at most 350 KB; only the active LCP candidate is requested eagerly.
- Lab HTML TTFB target at most 800 ms under the recorded topology/profile.
- Field p75 objectives after sufficient data: LCP at most 2.5 s, INP at most 200 ms, CLS at most 0.10. A route cohort needs 200 eligible samples in a rolling 28-day window or reports “insufficient data.”

Support defects that block content/action, expose data, break keyboard/reduced-motion behavior, or cause severe layout overflow are release blockers. Cosmetic differences outside the guaranteed matrix are triaged but do not justify unsafe polyfills.

## Consequences and constraints

- Moving browser targets are evaluated at release while CI remains reproducible through pinned binaries/artifacts.
- Real Safari/iOS and physical Android checks remain manual because emulation is not equivalence.
- Motion/media ambitions are subordinate to the constrained-device and reduced-motion gates.
- A browser-expansion request must include measured audience need, bundle cost, and a test device.

## Verification

- P00.5 records the first exact baseline without changing this profile.
- CI stores traces, screenshots, axe reports, Lighthouse reports, and bundle/media budgets for failed gates.
- Release checklist records real Safari/iOS/Android results, 200%/400% reflow, 44×44 targets, `100dvh`, safe areas, and no horizontal overflow.

## Rollback implication

If an enhancement misses a supported-browser or performance gate, disable that enhancement and ship the static/custom fallback; do not narrow the declared browser matrix after implementation. Runtime-major rollback requires dependency/build verification and a superseding deployment note.

## References

- [Next.js 16 runtime and browser requirements](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Playwright browser version and WebKit behavior](https://playwright.dev/docs/browsers)
- [Vercel Node.js runtime versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
