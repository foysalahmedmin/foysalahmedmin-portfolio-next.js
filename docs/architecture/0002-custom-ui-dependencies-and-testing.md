# ADR 0002: Custom UI, dependency policy, and test stack

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Product owner and repository maintainer
- **Supersedes:** None

## Context

The portfolio should demonstrate custom product engineering. It already has a custom component layer, but also contains focused third-party utilities and has no automated test stack. “Custom” must not lead to hand-rolled security parsers, carousel physics, or test infrastructure.

## Decision

Public and admin components remain repository-owned. Do not add shadcn, TanStack Table, a headless component suite, a page-builder runtime, or a runtime motion/parallax framework. Motion uses CSS, Web Animations where appropriate, `IntersectionObserver`, and a single requestAnimationFrame scheduler behind custom primitives.

A runtime dependency needs a short ADR amendment or new ADR when it adds UI behavior, affects the public bundle, processes untrusted input, introduces a service/vendor, or duplicates an existing primitive. Review bundle cost, maintenance, license, server/client boundary, failure mode, and removal path first. Security parsers and provider SDKs are preferred over custom implementations when their boundary is narrow and tested.

### Existing dependency disposition

| Dependency/group                                                                              | Decision and ownership boundary                                                                                                                                                          |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js, React, React DOM                                                                     | Retain as the framework baseline. Prefer Server Components and small client islands.                                                                                                     |
| Tailwind CSS, `clsx`, `tailwind-merge`, `class-variance-authority`                            | Retain as styling/composition utilities; they do not own component markup or behavior.                                                                                                   |
| `lucide-react`                                                                                | Retain as the tree-shaken icon source behind repository-owned icon/button semantics. Do not import the full icon namespace into public client bundles.                                   |
| `embla-carousel`, `embla-carousel-react`                                                      | Retain only behind `components/ui/carousel`; no feature imports Embla directly. The wrapper owns semantics, keyboard/touch behavior, focus, reduced motion, and state.                   |
| `embla-carousel-autoplay`                                                                     | Retain behind that wrapper. The wrapper owns all pause reasons, a visible control, page visibility, focus/hover, reduced motion, and session-persisted user pause.                       |
| `embla-carousel-class-names`                                                                  | Replace and remove. It is currently unused outside initialization; repository-owned `data-*` state is enough.                                                                            |
| `react-github-calendar`                                                                       | Retain as a non-critical adapter, dynamically loaded below the fold. Wrap its loading/error/empty/accessibility states; it cannot be primary proof or block a route.                     |
| `react-tooltip`                                                                               | Replace and remove after an accessible custom tooltip/disclosure primitive exists. Contribution cells must retain accessible text without it.                                            |
| `tw-animate-css`                                                                              | Replace and remove. Required keyframes and tokens move into the custom motion layer with reduced-motion behavior.                                                                        |
| Redux Toolkit and React Redux                                                                 | Retain during migration for true cross-client preferences only. Server content/session data must not be copied into Redux; remove obsolete auth/settings state after DAL adoption.       |
| `cookies-next`                                                                                | No new usage; replace with `next/headers` on the server and narrow browser APIs in client-only preference code, then remove if unused.                                                   |
| Mongoose, MongoDB, Zod, bcrypt, jsonwebtoken, Nodemailer, storage SDKs, Multer, `http-status` | Retain initially behind repositories/services/adapters. Their future replacement is independent of the custom UI policy. Provider and parser details must not leak into content modules. |

### Approved security dependencies

Installation occurs in its implementation milestone, not in this ADR:

- `sanitize-html` plus its types for a server-only semantic HTML allowlist.
- `file-type` for maintained magic-byte detection.
- `sharp` for bounded raster metadata/decode, orientation, metadata stripping, and canonical output.

Uploaded SVG is rejected in v1; source-reviewed code-native SVG remains allowed. These packages never become client dependencies.

### Smallest approved dev-only quality stack

| Capability                        | Dependency                                                                                    | Reason                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Unit/domain and route tests       | `vitest`, `@vitest/coverage-v8`                                                               | Vite-compatible TypeScript runner, mocks, timers, and V8 coverage.                   |
| React interaction tests           | `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom` | Tests behavior and accessibility semantics without a component framework.            |
| Browser E2E and visual regression | `@playwright/test`                                                                            | One runner supplies browsers, devices, traces, screenshots, and snapshot assertions. |
| Browser accessibility             | `@axe-core/playwright`                                                                        | Automated WCAG regression checks inside real routes.                                 |
| Repeatable performance gate       | `@lhci/cli`                                                                                   | Pins Lighthouse collection/assertions and stores reviewable artifacts.               |

Playwright built-in screenshots are the visual system; do not add Percy/Chromatic. Integration tests use an isolated Mongo test database and deterministic fixtures; do not add an in-memory Mongo package or MSW unless a later measured need justifies it. Exact compatible versions are selected together, recorded by `pnpm-lock.yaml`, and browser binaries are pinned by the Playwright version.

## Consequences and constraints

- Custom UI remains visible in the codebase while narrow, hard-to-recreate engines stay replaceable.
- Third-party enhancement failure must degrade to meaningful server-rendered content.
- Test packages are dev-only and cannot be imported from production source.
- Dependency removal work follows replacement and regression coverage; it is not a bulk uninstall.

## Verification

- Dependency-boundary lint/review confirms direct Embla and sanitizer imports occur only in approved adapters.
- Bundle analysis confirms lazy third-party enhancements are absent from critical initial chunks.
- P00.4 installs only the approved dev stack and records scripts/configuration.

## Rollback implication

Every retained UI utility is hidden behind a repository-owned adapter, so it can be replaced without changing feature APIs. If new quality tooling proves incompatible, revert its configuration and lockfile addition; do not remove tests or weaken the release scenarios.
