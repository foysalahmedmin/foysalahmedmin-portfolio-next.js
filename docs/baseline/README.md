# Pre-transformation baseline

Recorded on 2026-07-15 against commit `91dddac` before the portfolio
transformation began. This document is the comparison point for later
accessibility, performance, content, and resilience work.

## Environment

| Item     | Value                                  |
| -------- | -------------------------------------- |
| Node.js  | 20.20.2                                |
| pnpm     | 10.33.2                                |
| Next.js  | 16.1.1                                 |
| Browser  | Google Chrome 150.0.7871.115, headless |
| Viewport | 1440 × 1000                            |

The baseline source passed `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
No local MongoDB instance or `.env.local` was available during the runtime
capture.

## Runtime baseline

The existing production build was served with `next start` on localhost. A
request to each sampled route returned an HTTP 200 shell, but routes depending
on application data rendered a server-side exception because `DATABASE_URL`
was absent. A 200 response is therefore not a valid health signal for this
baseline.

| Route       | HTTP status | Response bytes | Local response time |
| ----------- | ----------: | -------------: | ------------------: |
| `/`         |         200 |        270,521 |              165 ms |
| `/about`    |         200 |        281,325 |               28 ms |
| `/projects` |         200 |         40,855 |                9 ms |
| `/articles` |         200 |         40,844 |                5 ms |
| `/admin`    |         200 |         27,523 |                8 ms |

Local timings are diagnostic only. They are not lab or field performance
scores and must not be compared with deployed Web Vitals.

The captured desktop failure state is preserved in
[`screenshots/home-desktop.png`](./screenshots/home-desktop.png). It establishes
the initial resilience defect: missing infrastructure configuration replaces
the public experience with a framework error instead of a designed fallback.

## Static delivery baseline

Largest checked-in public assets:

| Asset                       | Disk size |
| --------------------------- | --------: |
| `public/logo.svg`           | 1,608 KiB |
| `public/images/profile.png` |   932 KiB |
| `public/logo.png`           |    52 KiB |

Largest emitted JavaScript chunks from the baseline build:

| Rank | Disk size |
| ---: | --------: |
|    1 |   580 KiB |
|    2 |   220 KiB |
|    3 |   112 KiB |
|    4 |   112 KiB |
|    5 |    60 KiB |

These are uncompressed filesystem sizes. Later bundle reporting must compare
route-level transferred and compressed bytes, not only these emitted files.

## Source-shape indicators

The initial audit found:

- 65 files under `src/app`, `src/components`, and `src/hooks` containing a
  client-component directive.
- 11 source files containing raw `<img>` usage.
- 5 source files using `dangerouslySetInnerHTML`.
- 76 App Router API route handlers.
- 23 files in the custom `src/components/ui` system.

These counts are inventory signals, not automatic defects. Each raw media,
HTML, and client boundary must be reviewed in context.

## Measurement protocol for later milestones

After representative seed data and browser automation exist, record desktop
and mobile screenshots for every public route and the main admin views. Run
axe, keyboard/focus checks, reduced-motion checks, Lighthouse CI, route bundle
analysis, and deployed Web Vitals using the browser/performance matrix in the
architecture decisions. Keep missing-data and provider-failure captures in the
regression suite so resilience is measured alongside the polished happy path.
