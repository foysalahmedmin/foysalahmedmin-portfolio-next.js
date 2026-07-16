# Browser quality workflow

The browser layer uses the dev-only packages approved in ADR 0002: Playwright,
axe for Playwright, and Lighthouse CI. Tests must use local/test data and must
never point at production storage or MongoDB.

## Commands

- `pnpm test:e2e` runs the supported browser/device projects.
- `pnpm test:a11y` runs the real-route axe and landmark checks in Chromium.
- `pnpm test:visual` runs deterministic screenshot assertions once a reviewed
  snapshot is added; `pnpm test:visual:update` is the explicit approval step.
- `pnpm test:performance` builds the application and runs median-of-three
  Lighthouse collection against the pinned configuration.

Install the browser binaries with `pnpm exec playwright install`. CI installs
the pinned Chromium, Firefox, and WebKit binaries from the lockfile version.
Failures retain traces, screenshots, video, the HTML report, and Lighthouse
artifacts under `test-results/`; those artifacts must not contain authenticated
admin content, contact PII, cookies, credentials, or production URLs.

Do not solve flakes by adding arbitrary sleeps. Prefer accessible locators,
explicit state assertions, deterministic mocked provider boundaries, and
trace-led fixes. Snapshot changes are reviewed locally and committed only when
the visual change is intentional across the documented viewport/theme/motion
matrix.
