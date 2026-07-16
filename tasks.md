# Portfolio Transformation Execution Ledger

**Master plan:** [`plan.md`](./plan.md)
**Project:** `foysalahmedmin-portfolio-next.js`
**Ledger version:** 2.1
**Last updated:** 2026-07-17
**Execution state:** Active from reviewable implementation checkpoint `7b7b2cf`; `c06ff91` remains the recovery baseline and remaining product/release tasks are tracked below

## Live progress summary

This ledger is the authoritative implementation handoff. The phase table is intentionally conservative: `Complete` means every task and acceptance gate in the phase is done; `Verification` means the main implementation exists but a final health check and/or isolated commit is still required; `Partial` means meaningful work exists and named tasks remain; `Blocked input` is reserved for facts, consent, credentials, or production decisions only the owner can supply.

| Phase | State        | Immediate evidence                                                                                                                                  | Next boundary                                                                                                             |
| ----- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P00   | Partial      | ADRs, truth schema/manifest, test harness, code baseline                                                                                            | Complete owner fact inventory and reproducible browser baseline                                                           |
| P01   | Verification | Committed public DTO/visibility/contract/admin-access implementation and tests                                                                      | Release-wide aggregate/soft-delete regression acceptance                                                                  |
| P02   | Verification | Committed secure contact, rich content, media, auth/session code; replica-set suite passes                                                          | End-to-end abuse/session/media acceptance                                                                                 |
| P03   | Verification | Committed custom design tokens/layout/primitives and UI tests                                                                                       | Cross-device/a11y acceptance                                                                                              |
| P04   | Verification | Custom reveal/parallax/autoplay/reduced-motion tests                                                                                                | Browser trace and narrative integration acceptance                                                                        |
| P05   | Partial      | Route states, fallbacks, CI/browser tooling                                                                                                         | Production-like browser/visual/Lighthouse evidence                                                                        |
| P06   | Verification | Committed migration/audit/domain/File evolution; replica-set integration passes                                                                     | Production migration/rollback rehearsal                                                                                   |
| P07   | Verification | Committed Site singleton/five pillars/cache/metadata; type/build gates pass                                                                         | Browser/cache-invalidation acceptance                                                                                     |
| P08   | Verification | Committed repeatables/Page/inbox/dashboard/resolver and tests                                                                                       | Admin/public cross-domain browser acceptance                                                                              |
| P09   | Partial      | Guarded seed engine and expanded draft/noindex foundation seed for services, skills, process, FAQs, legal templates, and derived capability signals | Real-Mongo seed test; owner-approved production content                                                                   |
| P10   | Verification | Committed capability-aware shell and live dashboard                                                                                                 | Browser and cross-device acceptance                                                                                       |
| P11   | Verification | P11.1–P11.5 are committed through `7b7b2cf`; 118 files/684 unit tests plus type, lint, build, authority, and real-handler data-boundary gates pass  | Complete authenticated admin browser acceptance in P20.2; rerun real-Mongo integration when its isolated URI is available |
| P12   | Partial      | Generated five hero candidates are recorded with tracked seed/public asset paths, checksums, budget evidence, and truthful remaining blockers       | Approve, ingest, attach, and verify managed media                                                                         |
| P13   | Partial      | Dynamic shell and accessible five-slide fallback hero                                                                                               | Managed hero media + browser/performance verification                                                                     |
| P14   | Partial      | Published Page composition and evidence sections                                                                                                    | Finish proof-driven homepage narrative                                                                                    |
| P15   | Verification | Committed discovery/detail, responsive filters, role projection, and focused tests                                                                  | Full browser/device acceptance                                                                                            |
| P16   | Verification | Committed article discovery/detail and focused tests                                                                                                | Full browser/device acceptance                                                                                            |
| P17   | Partial      | Dynamic contact/legal and data-driven About foundations                                                                                             | Deep About narrative and preview parity                                                                                   |
| P18   | Partial      | Metadata/JSON-LD/fallback/CWV foundations                                                                                                           | Full SEO/image/network/CWV audit                                                                                          |
| P19   | Partial      | CSP/request context/redaction/telemetry/a11y foundations                                                                                            | Complete abuse/a11y/ops acceptance matrix                                                                                 |
| P20   | Pending      | Release checklist defined                                                                                                                           | Run gates after P11–P19 and owner inputs are resolved                                                                     |

### Status markers and ownership

- `[x]` implemented and proportionally verified.
- `[-]` actively in progress or implemented but awaiting its stated verification.
- `[ ]` not started or still materially incomplete.
- `[!]` blocked by an explicit external/user input; the blocker must be written beside it.
- Recovery is isolated through `c06ff91`, with the later P11 implementation checkpoint verified through `7b7b2cf`. Future work must return to a clean tree after every logical slice; a phase is not release-complete until its gate evidence is recorded.
- Owner-supplied verified biography, employment/education/credential facts, project outcomes, testimonial consent, resume/contact choices, production secrets, provider credentials, and deployment access remain external inputs. Engineering uses draft/noindex fallbacks until they arrive.

## How to use this ledger

- Execute in milestone order unless a task explicitly says it can run in parallel.
- After P02, the P03–P05 UI-foundation lane and P06–P09 backend/content lane may run in parallel; shared-file conflicts and each listed dependency still take precedence.
- `[ ]` pending, `[-]` in progress, `[x]` completed, `[!]` blocked with the blocker written beside it.
- A milestone is not complete until its acceptance criteria and verification checks pass.
- Check off tasks only after inspecting the resulting behavior/diff.
- Use the suggested commit boundary as the default; split it if the diff becomes difficult to review.
- Before every commit: preserve unrelated user changes, inspect `git diff`, run proportional checks, and update this ledger.
- Do not publish demo data, unverified claims, fake testimonials, secrets, credentials, or provider-specific storage code.
- All editorial/generated files must pass through the managed File ingestion path shared by storage middleware, File API, and trusted seed/media scripts; no caller implements Cloudinary/GCP logic directly.
- No shadcn, TanStack Table, or new runtime motion/UI framework.

## Global release gates

These apply continuously:

- [x] `pnpm typecheck` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm build` passes.
- [ ] Relevant automated tests pass once introduced.
- [ ] No public response exposes draft/private/admin-only data.
- [ ] No visible action is inert or simulates success.
- [ ] No missing asset renders as a broken image.
- [ ] No new nested interactive elements are introduced.
- [ ] Normal and reduced-motion experiences are both complete.
- [ ] All changed content is truthful or clearly marked as demo/draft.

### Latest verification evidence — 2026-07-16

- [x] `pnpm exec tsc --noEmit` completed successfully.
- [x] `pnpm lint` completed successfully.
- [x] Latest full unit rerun at `7b7b2cf` completed with 118 files and 684/684 tests passing.
- [x] P11 final-head TypeScript, full lint, and 65-page no-database production build completed successfully.
- [x] P11 route/data boundary suite executes real handlers, auth middleware, validation, controllers, and services for Contact, ProjectResource, Review, Users, Audit, and Taxonomy: 28/28 tests pass.
- [ ] Fresh real-Mongo integration rerun at the P11 head: all 6 files/26 cases were discovered but skipped because no isolated replica-set URI was supplied in this environment; the earlier `c06ff91` replica-set evidence remains valid only for that baseline.
- [x] Focused Site/Page, media, resolver/Home, discovery, legal, and editor suites passed.
- [x] Foundation seed expansion focused pass: `seed-foundation`, public section/metadata/rendering suites, targeted ESLint, and TypeScript completed on 2026-07-17; local Node still reports 20.20.2 while the project requires 24.x.
- [x] Fresh unit suite completed on 2026-07-17: 123 files and 710/710 tests passed after seed media binding reconciliation.
- [x] Stabilize the ProjectGallery focus-restoration test by keeping the modal state callback identity stable; the full rerun passes.
- [x] Run the real MongoDB replica-set integration suite: 6 files/26 tests passed; the combined run passed 103 files/556 tests.
- [x] Run `pnpm build` with a valid isolated database: all 65 static pages and the route manifest completed.
- [x] Make the ordinary/CI no-database build resilient: `/privacy` and `/terms` render the honest noindex fallback, and all 65 static pages build without `DATABASE_URL`.
- [x] Finish the isolated Contact Chromium flow: all 3/3 assertions pass with status checks scoped to `#contact-form-status`.
- [x] Prevent unsafe Playwright server reuse with an isolated default port and a verified portfolio readiness/contact marker.
- [ ] Run Lighthouse/visual matrices under the pinned Node 24/browser profile; the local audit currently reports Node 20.20.2 while the project requires Node 24.x.

### Completed recovery commit sequence

1. `d27203b` — roadmap and execution ledger migration/reconciliation.
2. `106aee5` — duplicate case-conflicting partial cleanup.
3. `1008baa` — secure platform, domain, storage, Site/Page, repeatable, migration, and seed foundations.
4. `33aa9ee` — custom design and motion system.
5. `8f19a0f` — secure admin shell and content workspaces.
6. `c06ff91` — dynamic public shell, discovery, details, legal fallback, and Page composition.

The recovery boundary remains the complete chain through `c06ff91`; `1008baa` was an intermediate dependency-layer commit, not a standalone product release. The current P11 implementation boundary is the later chain through `7b7b2cf`, with `ba98f68` as the interleaved P12 direction contract. Generated assets, final narrative work, authenticated browser acceptance, and the full hardening/release matrix remain roadmap work rather than recovery debt.

---

## P00 — Audit, scope, and decision lock

### P00.1 Full-project baseline

**Status:** Complete

- [x] Inventory public routes, admin routes, API modules, UI primitives, media, configs, and scripts.
- [x] Audit Home, About, Projects, Articles, Contact, Legal, Header, and Footer.
- [x] Audit custom UI system, animation hooks, global styles, and current responsive structure.
- [x] Audit backend/public DTO boundaries, File/storage lifecycle, admin modules, and seed/migration state.
- [x] Audit accessibility, performance, SEO, content trust, image strategy, testing, and observability.
- [x] Run `pnpm typecheck` successfully.
- [x] Run `pnpm lint` successfully.
- [x] Run `pnpm build` successfully.
- [x] Write the master architecture/product plan.
- [x] Write this dependency-ordered execution ledger.

**Baseline note:** the original planning ledger was created outside the application Git root; version 2.0 moves both roadmap files into the repository so every later status change is reviewable and commit-tracked.

### P00.2 Architecture decision records

**Dependencies:** P00.1

- [x] Add an ADR/documentation location inside the repository so implementation decisions are versioned.
- [x] Record the canonical five pillar keys, labels, order, and ownership rules.
- [x] Record custom UI/no-new-runtime-motion dependency policy.
- [x] Audit existing Embla, GitHub Calendar, react-tooltip, and `tw-animate-css`; record retain/wrap/lazy-load/replace decisions and ownership boundaries.
- [x] Decide the smallest dev-only test stack; document why each dependency is needed before installation.
- [x] Record the decision to embed the five pillars atomically in Site and reference their stable enum keys elsewhere.
- [x] Decide typed page sections: discriminated section subdocuments and explicit section registry.
- [x] Decide rich content format and sanitization boundary.
- [x] Approve maintained sanitizer/file-signature libraries as justified security dependencies or document an equally safe maintained alternative; do not hand-roll security parsers.
- [x] Decide session/DAL structure for server-protected admin routes.
- [x] Define distributed rate-limit storage, contact idempotency/outbox behavior, and production topology assumptions.
- [x] Define public DTO policy, Next.js 16 cache mode/tag/invalidation semantics, error envelope, correlation ID, and audit event conventions.
- [x] Define publishing/concurrency policy: Site/Page snapshots; record-module status plus optimistic version and AuditEvent history.
- [x] Define migration naming/version/checksum policy.
- [x] Define supported browsers/devices and deployment environment assumptions.

**Acceptance criteria**

- [x] Every consequential architectural choice has an owner, rationale, constraints, and rollback implication.
- [x] No implementation task depends on an unresolved hidden assumption.

**Verification**

- [x] Review ADRs against `plan.md` principles.
- [x] Confirm no runtime UI dependency has been silently added.

**Suggested commit:** `Document portfolio architecture and quality decisions`

### P00.3 Truthful content inventory

**Dependencies:** P00.1; may run alongside P00.2

- [ ] Create a private content worksheet/schema for identity, biography, availability, response time, contact, location, and resume.
- [ ] Inventory real projects and label each as client work, internal product, open source, or engineering lab.
- [ ] Record role, dates, links, stack, architecture, security decisions, and verifiable outcomes per project.
- [ ] Inventory authored articles/topics and map each to a primary pillar.
- [ ] Verify employment, education, certifications, courses, and awards.
- [x] Identify which numerical metrics can be derived and which require manual evidence.
- [x] Verify testimonial identity, wording, relationship, source, and publication consent; otherwise mark unavailable.
- [x] Decide whether a genuine portrait remains or the About surface uses an abstract identity visual.
- [x] Record visibility rules for source/live links and confidential client details.
- [x] Mark every legacy hardcoded claim as keep/edit/remove/unverified.
- [x] Keep private evidence, consent proof, confidential client information, and contact PII outside Git; commit only a redacted schema and approved public manifest.

**Acceptance criteria**

- [ ] Production copy can be separated from demo content mechanically.
- [ ] Unverified claims have no public-publish path.

**Suggested commit:** `Define redacted verified portfolio content manifest`

### P00.4 Test and fixture foundation

**Dependencies:** P00.2 test-tooling decision; may run alongside P00.3

- [x] Install only the approved dev-only unit/integration test tooling.
- [x] Add `test`, `test:watch`, and `test:integration` scripts.
- [x] Add isolated test environment and database handling.
- [x] Support a replica-set-capable transaction test mode and an explicit compensation-mode test when transactions are unavailable.
- [x] Add deterministic fixture factories with safe setup/cleanup.
- [x] Add API/request helpers for public projection, auth, validation, and failure-path tests.
- [x] Add coverage reporting for security-critical and core domain logic.
- [x] Add an initial CI job for typecheck, lint, unit/integration tests, and build.
- [x] Document local/CI test commands and data-safety rules.

**Acceptance criteria**

- [x] P01/P02 regression tests can run before their production code changes.
- [x] Tests cannot access or mutate production data/storage.
- [x] A deliberately broken public-visibility rule fails the suite.

**Suggested commit:** `Add safe domain and integration test foundation`

### P00.5 Pre-redesign measurable baseline

**Dependencies:** P00.2; use an approved pinned audit tool/profile without waiting for the redesign

- [ ] Record the exact Chrome/Lighthouse/axe versions, mobile device/network/CPU profile, production-like fixture set, and warm/cold cache conditions.
- [ ] Capture the median of three Lighthouse runs for Home, About, Projects, Articles, and representative detail pages.
- [ ] Capture current automated accessibility findings and a keyboard smoke report.
- [ ] Save public/admin screenshots at the agreed viewport/theme matrix without private data.
- [x] Record emitted chunk sizes, route-level transfer where measurable, client-component count, raw image requests, and the largest assets.
- [ ] Capture Home database/request behavior, hero network waterfall, layout shift, and a scripted animation/scroll trace.
- [x] Store redacted baseline artifacts inside versioned project documentation.

**Acceptance criteria**

- [ ] Later performance, accessibility, bundle, and visual claims can be compared with a reproducible starting point.
- [x] Baseline artifacts contain no credentials, cookies, contact messages, or private client data.

**Suggested commit:** `Record the pre-redesign portfolio baseline`

---

## P01 — Public data integrity and critical correctness

### P01.1 Public visibility projections

**Dependencies:** P00.2 test/DTO decisions, P00.4

- [x] Add regression tests for public article visibility: published, published date reached, not expired unless explicit expiry, not deleted.
- [x] Remove automatic 24-hour article expiry; make expiry optional and explicit.
- [x] Add regression tests for public project visibility: completed/published public rules only.
- [x] Replace Home article/project internal readers with shared public-safe readers/DTOs.
- [x] Filter public ProjectResource data by `is_private !== true` and project visibility.
- [x] Filter public reviews to approved records and return a safe author projection without email/admin fields.
- [x] Restrict or remove public user-detail access; expose a deliberate public profile DTO only if required.
- [x] Filter inactive/deleted public article and project categories consistently.
- [x] Add maximum page sizes and allowlisted sort/filter fields to every public list.
- [ ] Verify soft-deleted records cannot reappear through populate/aggregate paths.
- [x] Ensure Home, list, and detail visibility rules agree.

**Acceptance criteria**

- [x] Draft, pending, planned, private, expired, rejected, deleted, and admin-only fields cannot be retrieved publicly.
- [x] A normal published article stays visible until explicitly expired/archived.
- [x] Home and list pages show the same visibility semantics.

**Verification**

- [ ] Run public projection unit/integration tests.
- [ ] Manually probe public endpoints with records in every status.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Harden public portfolio content projections`

### P01.2 Soft-delete and restore correctness

**Dependencies:** P01.1 can share tests but should be a separate commit

- [x] Inventory every model query/update/aggregate soft-delete hook.
- [x] Replace unconditional exclusions with a single documented bypass mechanism.
- [x] Test normal read, admin trash read, restore, bulk restore, permanent delete, and aggregate behavior.
- [x] Ensure unique indexes do not make legitimate restore/migration behavior ambiguous.
- [x] Ensure populated relations respect intended deleted-record policy.
- [x] Normalize restore/permanent route response and partial-failure reporting.

**Acceptance criteria**

- [ ] Trash/restore/permanent-delete flows work for every existing module.
- [ ] Normal queries still hide deleted records by default.

**Verification**

- [ ] Run delete/restore integration matrix.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Make soft delete and restore behavior reliable`

### P01.3 Contract alignment and broken discovery flows

**Dependencies:** P01.1

- [x] Make Project search send the backend-supported `search` parameter.
- [x] Fix `AppQuery` boolean parsing so the string `"false"` is not treated as truthy.
- [x] Validate public GET query parameters with Zod, reject NoSQL operators, normalize pagination-disabled responses, and cap limits.
- [x] Build/test reusable custom URL query-state, debounce, and abort/stale-request primitives; P15/P16 adopt them rather than rebuilding discovery twice.
- [x] Align article/project frontend types with actual model/DTO fields.
- [x] Align category frontend types with backend fields or add the missing validated fields deliberately.
- [x] Fix stale singular `/api/user` service paths.
- [x] Require category selection in project/article admin forms and load allowed options.
- [x] Add collision-safe slug fields and validation to the contract plan; migrations occur in P06.
- [x] Normalize query, pagination, error, and validation envelopes.
- [x] Remove incorrect `support@binduui.com` and other legacy template config after Site parity exists; until then use a correct temporary source.

**Acceptance criteria**

- [x] Query primitives round-trip search/filter/sort/page state and handle back/forward navigation; page integrations occur in P15/P16.
- [x] Frontend types, form payloads, validation, model fields, and public DTOs agree.

**Verification**

- [x] Test rapid search, invalid query, no results, server error, pagination, and browser navigation.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Align portfolio contracts and public query state`

### P01.4 Immediate admin route protection

**Dependencies:** P00.2 session/DAL ADR, P00.4; run as soon as these dependencies are ready rather than waiting for P02 feature work

- [x] Create centralized server session verification close to protected data access.
- [x] Protect the entire admin route group before rendering private UI/data.
- [x] Keep authorization inside every API/mutation; the route guard is only the first boundary.
- [x] Replace/remove the unused Redux/localStorage-only AuthWrapper pattern.
- [x] Redirect unauthenticated users to `/admin/signin` with a validated same-origin return path.
- [x] Prevent open redirects and mark admin/sign-in surfaces `noindex`.
- [x] Add regression tests for unauthenticated, expired, blocked, deleted, user, editor, admin, and super-admin navigation.

**Acceptance criteria**

- [x] Direct URL navigation and nested admin entries cannot render private content without a valid authorized server session.
- [x] API authorization remains effective independently of UI/route visibility.

**Suggested commit:** `Protect admin routes on the server`

---

## P02 — Contact, rich content, uploads, and session security

### P02.1 Real contact intake

**Dependencies:** P00.2 error/security decisions, P00.4

- [x] Replace simulated timeout with the real `POST /api/contacts` request.
- [x] Add client and server validation with one shared contract where practical.
- [x] Connect labels, IDs, descriptions, required state, and field errors accessibly.
- [x] Add pending, success, failure, retry, duplicate, and timeout states.
- [x] Announce status through an appropriate ARIA live region.
- [x] Add a honeypot and minimum-fill-time signal.
- [x] Add distributed IP/session-aware rate limiting with proxy-aware client identification; do not rely on per-process memory in production.
- [x] Add an idempotency/deduplication key and safe repeat-submission semantics.
- [x] Apply origin/fetch-metadata/CSRF policy to the public write.
- [x] Escape notification email content and prevent header injection.
- [x] Add contact status fields: new, read, replied, qualified, spam, archived.
- [x] Avoid logging message bodies or personal content.
- [x] Add delivery status plus outbox/retry handling without losing the stored inquiry.
- [x] Define contact PII retention, deletion/anonymization, export/access, and purge-job requirements for P08/P17 implementation.

**Acceptance criteria**

- [x] Success appears only after the server stores the submission.
- [x] Abuse controls do not block a normal keyboard/screen-reader submission.
- [x] An email-provider failure does not falsely discard a valid inquiry.

**Verification**

- [ ] Unit/integration tests for validation, honeypot, rate limit, persistence, and notification failure.
- [ ] Manual keyboard and live-region test.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Connect secure contact intake end to end`

### P02.2 Safe rich-content boundary

**Dependencies:** P00.2 rich-content decision, P00.4

- [x] Inventory all `dangerouslySetInnerHTML` sinks and all write paths producing their content.
- [x] Define an allowlist for headings, paragraphs, lists, links, tables, quotes, code, images, and safe attributes.
- [x] Sanitize on the server before storage/publish or store typed blocks according to the ADR.
- [x] Re-sanitize legacy content during migration.
- [x] Enforce safe URL protocols and external link attributes.
- [x] Add regression fixtures for script, event-handler, SVG, URL, style, and malformed-markup attacks.
- [x] Add CSP-compatible rendering constraints.
- [x] Provide a minimal safe legacy renderer; editorial typography, TOC, and code interactions are implemented after P03 in P15/P16.

**Acceptance criteria**

- [x] Stored/reflected HTML cannot execute script or unsafe URL behavior.
- [x] Valid content remains readable until the final editorial design is introduced.

**Verification**

- [x] Run sanitizer/renderer security tests.
- [x] Manually inspect representative long-form article/project content.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Secure portfolio rich-content boundaries`

### P02.3 File and storage hardening

**Dependencies:** P01.2, P00.4; storage abstraction already exists

- [x] Define file-purpose policies for logo, hero, project, article, profile, resume, and generic media.
- [x] Extract a provider-neutral `ManagedMediaService` used by storage middleware/File API and trusted seed/media scripts without internal HTTP calls.
- [x] Keep upload route handlers explicitly on the Node runtime and enforce early request-size/concurrency limits before buffering.
- [x] Validate magic bytes/signatures with a maintained parser, MIME, extension, dimensions, duration, and per-purpose size limits.
- [x] Define raster re-encoding/quarantine policy rather than trusting decoded input.
- [x] Define a safe SVG policy; reject or sanitize active SVG content.
- [x] Add File lifecycle states: uploading, ready, orphaned, deleting, and error.
- [x] Add checksum/idempotency ingestion, immutable/versioned storage keys, cleanup/retry jobs, and duplicate handling.
- [x] Enforce ready/non-deleted/authorized/purpose-compatible checks for attach, detach, update, and permanent delete.
- [x] Add public/private access class; generate short-lived private delivery URLs without persisting signed URLs.
- [x] Add URL/path allowlists for Cloudinary and GCP delivery.
- [x] Keep v1 rendering provider-neutral: originals plus dimensions/focal/blur metadata and `next/image`; do not depend on Cloudinary-only transformations without a GCP-equivalent contract.
- [x] Use staged provider upload → database transaction → post-commit finalization; never imply Mongo transactions include Cloudinary/GCP.
- [x] Add tested idempotent compensation for provider upload/database/post-commit failure boundaries.
- [x] Prevent deletion of files referenced by draft or published snapshots unless an explicit safe detach workflow succeeds.
- [x] Test provider-specific delete using the provider stored on each record, independent of current `STORAGE_PROVIDER`.
- [x] Redact credentials/provider secrets from errors and logs.

**Acceptance criteria**

- [x] Invalid/disguised uploads are rejected server-side.
- [x] Failed content mutations do not leave stale references or orphaned newly uploaded files.
- [x] Cloudinary/GCP switching does not break old-file deletion.

**Verification**

- [ ] Run upload/reference/provider failure integration tests.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Harden managed media and file references`

### P02.4 Admin session lifecycle and capabilities

**Dependencies:** P01.4

- [x] Render signed-in user identity/role from a safe server DTO.
- [x] Implement logout to invalidate/clear access and refresh cookies plus client state.
- [x] Handle session expiry/refresh predictably.
- [x] Rotate/revoke refresh sessions, detect token reuse, and invalidate sessions after password/role/status changes.
- [x] Disable or explicitly scope public signup; protect initial super-admin bootstrap.
- [x] Prevent any signup/profile payload from assigning elevated roles.
- [x] Apply a documented admin password policy and secure recovery/reset flow.
- [x] Define the production MFA/recovery requirement for a publicly reachable admin and implement it before launch when required by the threat model.
- [x] Add role/capability helpers for navigation and actions.
- [x] Define and test an explicit capability matrix for every admin mutation.
- [x] Mark admin/sign-in/preview surfaces `noindex`.
- [x] Apply rate limiting and generic errors to sign-in.

**Acceptance criteria**

- [x] The P01.4 server boundary remains intact through session lifecycle changes.
- [x] Hidden UI does not substitute for backend authorization.
- [x] Logout works and a stale client state cannot reopen admin content.

**Verification**

- [x] Test unauthenticated, expired, blocked, deleted, user, editor, admin, and super-admin cases.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Protect admin routes and session lifecycle`

---

## P03 — Design-system foundation

### P03.1 Brand and token contract

**Dependencies:** P00.2, canonical pillars

- [x] Define light/dark surface, text, border, overlay, and semantic status tokens.
- [x] Define brand and five pillar accent tokens with contrast-safe pairings.
- [x] Define fluid type, spacing, container, grid, radius, elevation, z-index, and focus tokens.
- [x] Define motion duration, easing, distance, and parallax depth tokens.
- [x] Replace ambiguous/redefined accent utilities that can self-reference incorrectly.
- [x] Document allowed token usage and examples.
- [x] Add a private design-system preview route or Storybook-free in-app development surface.
- [ ] Test forced-colors/high-contrast behavior for essential controls.

**Acceptance criteria**

- [x] Public/admin components consume semantic tokens rather than one-off colors/sizes.
- [ ] Both themes meet contrast requirements for text, focus, borders, and statuses.

**Verification**

- [ ] Run automated contrast scan and manual token review.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Establish portfolio brand and design tokens`

### P03.2 Typography and layout primitives

**Dependencies:** P00.4, P03.1

- [x] Remove the global `max-w-3xl` container constraint.
- [x] Implement wide, content, and reading-measure containers with responsive gutters.
- [x] Implement Section, Stack, Cluster, Grid, and Bleed primitives.
- [ ] Configure approved self-hosted fonts with `next/font/local`.
- [x] Remove unused/missing font declarations and weights.
- [x] Define display, headings, lead, body, small, label, metric, quote, and mono/code styles.
- [x] Define safe custom editorial typography for headings, lists, tables, quotes, code, figures, and long-form rhythm.
- [x] Normalize page/section vertical rhythm.
- [ ] Prevent overflow at 320, 375, 768, 1024, 1440, and 1920 widths.
- [x] Handle `100dvh`, safe-area insets, mobile browser chrome, and sticky header offsets.
- [ ] Verify 200%/400% zoom and reflow before feature compositions build on these primitives.

**Acceptance criteria**

- [x] Desktop layouts can use the intended 12-column/1280–1360 px system.
- [x] Long-form content remains within a readable measure.
- [ ] Font loading creates no unacceptable layout shift.
- [ ] Supported-browser baseline covers the latest two desktop Chrome/Firefox/Safari/Edge releases plus current/previous-major iOS Safari and current Android Chrome.

**Verification**

- [ ] Screenshot/layout matrix in both themes.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Build responsive layout and typography primitives`

### P03.3 Core component accessibility refactor

**Dependencies:** P03.1–P03.2

- [x] Refactor Button/Link composition to prevent nested interactive elements.
- [x] Standardize focus-visible, disabled, loading, destructive, and icon-only states.
- [x] Improve form controls with accessible label/description/error contracts.
- [x] Improve Modal/Drawer/Dropdown focus trap, Escape, initial focus, and restoration.
- [x] Improve pagination with bounded page windows, accessible labels, and `aria-current`.
- [x] Improve tabs/accordion/FAQ semantics and keyboard behavior.
- [x] Improve tooltip behavior for keyboard/touch without hiding essential information.
- [x] Recheck custom DataTable selection announcements, focus, empty/error states, and mobile behavior.
- [x] Add Skeleton, EmptyState, ErrorState, RetryState, and StaleState primitives.
- [x] Add OptimizedMedia/PillarFallback primitives.

**Acceptance criteria**

- [ ] Core primitives have no serious/critical axe findings.
- [ ] Controls remain fully usable by keyboard with visible focus.

**Verification**

- [x] Component interaction/a11y tests.
- [ ] Manual keyboard test.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Make custom UI primitives accessible and resilient`

---

## P04 — Motion and parallax system

### P04.1 Motion preference foundation

**Dependencies:** P03.1

- [x] Implement `MotionProvider` with OS preference, explicit site override, document visibility, and capability tier.
- [x] Enforce precedence: OS reduce is the safety cap; explicit user “off/reduce” overrides Site; Site applies only without a user choice.
- [x] Start SSR/hydration in a safe non-moving state and prevent preference/motion flashes.
- [x] Implement a shared `useReducedMotion` API.
- [x] Add an accessible site-wide motion toggle and persistence policy.
- [x] Define static/opacity-only reduced-motion variants.
- [x] Stop smooth scrolling, autoplay, marquee, float, bounce, magnetic movement, and count-up travel under reduced motion.
- [x] Pause continuous work when the document is hidden.
- [x] Add tests for preference changes during a session.
- [x] Test SSR/hydration, OS change, explicit override, cleared override, Site default, and hidden-tab transitions.

**Acceptance criteria**

- [x] Reduced-motion content and controls are identical in meaning and function.
- [x] No continuous decorative animation runs after reduced motion is enabled.

**Suggested commit:** `Add shared motion preferences and safe fallbacks`

### P04.2 Reveal system replacement

**Dependencies:** P00.4, P03.3, P04.1

- [x] Remove the mismatched `data-observed-*`/`active` reveal contract.
- [x] Replace six subtree observers with one scalable reveal mechanism.
- [x] Implement declarative Reveal variants with tokenized distance/duration/delay.
- [x] Ensure server-rendered content remains visible when JavaScript is disabled or hydration fails.
- [x] Avoid `transition-all`; animate only explicit safe properties.
- [x] Support once/repeat behavior intentionally.
- [x] Remove obsolete observer/mutation utilities after all callers migrate.
- [x] Add reduced-motion and intersection tests.

**Acceptance criteria**

- [x] Reveal behavior works consistently without hiding content indefinitely.
- [x] One section does not create multiple global MutationObservers.

**Suggested commit:** `Replace legacy reveals with custom motion primitives`

### P04.3 Shared parallax engine

**Dependencies:** P04.1

- [x] Implement one passive scroll source and RAF scheduler.
- [x] Implement viewport-aware section progress and `ParallaxLayer`.
- [x] Clamp depth/travel and expose only tokenized transform behavior.
- [x] Suspend offscreen/hidden/reduced-motion work.
- [x] Add optional pointer depth without affecting keyboard focus or mobile stability.
- [x] Restrict pointer depth/magnetic behavior to `hover: hover` and `pointer: fine`.
- [ ] Add CSS ScrollTimeline enhancement only behind support detection.
- [ ] Add performance instrumentation for frame time/long tasks in development.
- [x] Add math, cleanup, and preference tests.
- [x] Expose deterministic progress inputs at 0, 0.5, and 1 for tests/visual regression.

**Acceptance criteria**

- [x] Required narratives can share the engine without attaching component-level scroll loops.
- [x] Parallax changes only transform/opacity and causes no CLS.

**Verification**

- [ ] Profile the named baseline desktop and mid-tier Android/emulation with a repeatable 10-second scroll.
- [ ] Verify desktop p95 frame ≤ 16.7 ms; mobile p95 frame ≤ 22 ms, at most two motion-caused tasks > 50 ms, and none > 100 ms, or record a traced tier adjustment.
- [x] Verify reduced-motion and hidden-tab shutdown.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Create performant shared parallax infrastructure`

### P04.4 Autoplay/carousel controller

**Dependencies:** P00.4, P03.3, P04.1

- [x] Implement shared pause reasons: user, hover, focus, hidden tab, reduced motion, offscreen.
- [x] Define pause-reason precedence so one cleared reason cannot incorrectly restart while another remains active.
- [x] Add visible pause/play behavior for motion lasting over five seconds.
- [x] Use an autoplay interval of at least six seconds and persist explicit user pause for the browser session.
- [x] Add labelled previous/next/direct navigation and stable active state.
- [x] Add keyboard/pointer/touch handling without blocking normal page scroll.
- [x] Ensure vertical gestures remain page scroll and a manual change resets timing without spawning duplicate timers.
- [x] Define polite screen-reader announcement rules for manual changes only.
- [x] Add timer cleanup and rapid-interaction tests.
- [x] Test duplicate-timer prevention, every pause-reason combination, unmount/remount cleanup, session pause, manual interaction, vertical swipe, and zero autoplay announcements.

**Acceptance criteria**

- [x] At most one timer exists; autoplay never restarts while any pause reason is active.
- [x] Reduced motion has no automatic entrance or slide motion.
- [x] Automatic changes are not announced; manual controls remain fully labelled.

**Suggested commit:** `Build accessible autoplay and slider controls`

---

## P05 — Route resilience and testing foundation

### P05.1 Browser, accessibility, and performance test expansion

**Dependencies:** P00.4, P03.3, P04

- [x] Add the approved component interaction/DOM harness.
- [x] Add the approved browser E2E runner and isolated browser fixtures.
- [x] Add automated axe integration.
- [x] Add Lighthouse CI and route budget configuration.
- [x] Add visual-regression snapshots for stable design-system/public/admin surfaces.
- [x] Add `test:e2e`, `test:a11y`, `test:performance`, and `test:visual` scripts as appropriate.
- [x] Expand CI with browser, accessibility, performance, and visual jobs at proportional trigger points.
- [x] Document local browsers, artifact review, snapshot approval, and flake-handling rules.

**Acceptance criteria**

- [x] Browser tests cannot mutate production data or use production storage.
- [ ] A deliberate keyboard/a11y/performance regression fails the appropriate gate.
- [ ] Visual snapshots require explicit review rather than automatic acceptance.

**Suggested commit:** `Expand portfolio browser and quality automation`

### P05.2 Route-level states

**Dependencies:** P03.3

- [x] Add root/global error UI with correlation/support guidance.
- [x] Add public route loading UI with stable skeleton dimensions.
- [x] Add route error/retry UI.
- [x] Add custom not-found UI and `notFound()` handling for missing details.
- [x] Add admin loading/error/not-found variants.
- [x] Replace `Suspense fallback={null}` with contextual skeletons.
- [x] Ensure errors do not leak stack traces, secrets, or internal record data.
- [x] Test JavaScript failure and slow data paths.

**Acceptance criteria**

- [x] No route or section silently disappears during loading/error.
- [x] Missing content returns a true 404 response.

**Suggested commit:** `Add resilient loading error and not-found states`

### P05.3 Emergency fallback and state resolver

**Dependencies:** P03.3

- [x] Implement the lightweight code-owned emergency fallback derived from the versioned pillar contract; do not create a second editable content manifest.
- [x] Implement deterministic fallback resolution by content type and pillar for DB/Site/storage failure.
- [x] Remove all references to nonexistent placeholder paths.
- [x] Prevent image `onError` fallback loops.
- [x] Preserve aspect ratio/layout while swapping fallback media.
- [x] Add honest defaults for missing optional author/date/category fields.
- [x] Block publish when required data lacks a safe fallback.
- [x] Test loading, empty, error, missing-media, broken-media, and stale states.
- [x] Leave final managed fallback File mapping to P12.3 while preserving this emergency layer.

**Suggested commit:** `Add deterministic content and media fallbacks`

---

## P06 — Migration system and existing domain evolution

### P06.1 Migration runner

**Dependencies:** P00.2 migration ADR, P00.4

- [x] Add Migration model/registry with ID, checksum, status, timestamps, duration, and error summary.
- [x] Add apply/status/dry-run commands.
- [x] Add production confirmation/backup guard for destructive work.
- [x] Make reruns idempotent and concurrency-safe.
- [x] Document rollback/forward-fix strategy.
- [x] Add migration fixtures/tests.

**Suggested commit:** `Add guarded database migration infrastructure`

### P06.2 Minimal AuditEvent foundation

**Dependencies:** P06.1, P02.4

- [x] Add redacted AuditEvent type/model with actor, action, target type/id, safe summary, correlation ID, timestamps, and retention metadata.
- [x] Define an allowlist/redaction policy that excludes secrets, tokens, contact messages, rich content bodies, and private evidence.
- [x] Add append-only service behavior and protected query DTO.
- [x] Add helper hooks for publish, sensitive settings, role/session, delete, restore, and permanent-delete events.
- [x] Add indexes for target, actor, action, and recency with a bounded retention/query policy.
- [x] Add authorization, immutability, redaction, and failure-path tests.

**Suggested commit:** `Add the redacted administrative audit foundation`

### P06.3 Project/article/category contract migration

**Dependencies:** P06.1, P01.3

- [x] Add normalized, collision-safe slugs with unique indexes scoped appropriately.
- [x] Migrate slugs in order: optional fields → deterministic backfill → partial unique indexes → dual ID/slug readers → canonical switch → later required validation.
- [x] Add slug-history records/aliases so future slug changes keep permanent redirects, not only legacy ID redirects.
- [x] Add primary/secondary pillar relationships.
- [x] Separate Project delivery lifecycle from editorial publication status.
- [x] Add required Project case-study fields and validation in backward-compatible stages.
- [x] Add live/source URL visibility and allowlisting.
- [x] Add outcome metric verification state.
- [x] Add Article excerpt, reading-time source, optional expiry, topic/pillar, and structured body metadata.
- [x] Align category schema/API/frontend fields.
- [x] Add migrations before making new fields required.
- [x] Update public/admin DTOs and forms incrementally.

**Acceptance criteria**

- [x] Existing records remain readable throughout deployment.
- [x] Legacy detail links redirect to stable canonical slugs.

**Suggested commits**

- `Add stable slugs and pillar relationships`
- `Expand projects into verified case study records`
- `Expand articles and category contracts`

### P06.4 File metadata migration

**Dependencies:** P02.3, P06.1

- [x] Add alt text, focal point, dominant color, blur placeholder, source, provenance, attribution/license, checksum, and purpose fields.
- [x] Extend File reference model enums for planned modules.
- [x] Backfill dimensions/source/provider metadata where available.
- [x] Flag incomplete media for admin remediation rather than inventing metadata.
- [x] Update upload DTOs and UI types.
- [x] Add migration and compatibility tests.

**Suggested commit:** `Expand managed media metadata and provenance`

---

## P07 — Site and five-pillar backend

### P07.1 Site domain module

**Dependencies:** P06.1, P06.2, P06.4

- [x] Add Site types with draft/published DTO separation.
- [x] Add unique singleton model and indexes.
- [x] Add strict Zod body/query/params validation.
- [x] Add repository with minimal public projection and revision-aware admin reads.
- [x] Add service rules for singleton creation, revision updates, File validation/reconciliation, and publish.
- [x] Use a conditional atomic update such as `{ site_key, revision: expected }`; do not implement optimistic concurrency as read-then-save.
- [x] Traverse and validate the full publish graph so deleted/private/draft/incompatible Files or content references block publication.
- [x] Add controller and error mapping.
- [x] Add public `GET /api/site` route.
- [x] Add protected admin read/update/publish routes.
- [x] Return `409 Conflict` on stale revision publish/update.
- [x] Add audit events and targeted cache invalidation.
- [x] Invalidate only after commit; log/retry cache invalidation failure without corrupting the valid published snapshot.
- [x] Add integration tests for draft isolation, publish, stale revision, media references, and public DTO safety.

**Acceptance criteria**

- [x] Public users receive only the last complete published snapshot.
- [x] A failed draft update/publish cannot corrupt the current public Site.

**Suggested commit:** `Add revisioned Site settings domain`

### P07.2 Canonical pillar invariants

**Dependencies:** P07.1

- [x] Encode exactly the five stable pillar keys.
- [x] Enforce uniqueness and canonical sequence.
- [x] Store label, hero copy, outcome, capabilities, technologies, CTA, icon key, accent, visual File, alt text, enabled state.
- [x] Store approved compact/mobile and long positioning variants plus a required code-owned fallback visual key.
- [x] Validate public publish has exactly five complete enabled hero pillars.
- [x] Allow incomplete/disabled draft work, but make the five-enabled invariant atomic at publish.
- [x] Expose relationship selectors for projects/articles/services/skills.
- [x] Generate the minimal emergency contract from the same versioned pillar source used by seeds; do not maintain a separate editable fallback manifest.
- [x] Add invariant and publish tests.

**Acceptance criteria**

- [x] Database and fallback both expose exactly the same five ordered keys.
- [x] No published surface can drift to three/four/six pillars.

**Suggested commit:** `Enforce the five-pillar portfolio contract`

### P07.3 Published Site data access and cache foundation

**Dependencies:** P07.1–P07.2

- [x] Add server-only published Site reader and minimal DTO.
- [x] Decide `unstable_cache` versus deliberate Cache Components adoption for installed Next.js 16.1.1.
- [x] Add bounded Site cache tags and explicit life/revalidation policy.
- [x] Use route-handler-compatible `revalidateTag(tag, "max")`/path semantics; reserve `updateTag` for Server Actions.
- [x] Use framework-cached published Site plus the minimal compile-time emergency identity; do not build a custom stale-content subsystem in v1.
- [x] Keep draft/admin/preview readers `no-store`.
- [x] Add publish-triggered targeted invalidation tests.

**Suggested commit:** `Cache published Site content safely`

### P07.4 Metadata foundation

**Dependencies:** P07.1–P07.3

- [x] Add Site-derived `metadataBase`, title template, canonical builder, default description, and social metadata helpers.
- [x] Add a central `noindex` policy/helper for admin, auth, preview, and error-only routes.
- [x] Add typed JSON-LD builders with safe escaping and no unsupported claims.
- [x] Define dynamic OG input/fallback contracts without implementing every route image yet.
- [x] Add unit tests for canonical, title, noindex, JSON-LD escaping, and fallback behavior.

**Suggested commit:** `Add the shared metadata and canonical foundation`

---

## P08 — Page and repeatable content domains

### P08.0 Shared persistence and query contract

**Dependencies:** P06.2, P07.2

- [x] Define common status, publication timestamp, optimistic version, soft-delete, creator/updater, audit, and DTO behavior for record modules.
- [x] Reserve draft/published snapshots for Site/Page; do not create revision subsystems for every small collection.
- [x] Define stable enum-key pillar relationships and purpose-compatible File references.
- [x] Define bounded pagination, filter/sort allowlists, compound indexes, collation/search behavior, and target query budgets.
- [x] Add explain-plan checks for primary public/admin query shapes and prevent unbounded collection scans.
- [x] Define transaction/compensation and post-commit cache invalidation behavior.
- [x] Define optimistic conflict responses for admin record edits.

**Suggested commit:** `Define shared dynamic content persistence rules`

### P08.1 Expertise content modules

**Dependencies:** P08.0

- [x] Implement Service module.
- [x] Implement SkillGroup/Skill module with pillar relations and proficiency evidence rules.
- [x] Keep low-volume process steps and metric configuration as typed embedded Site/Page content rather than independent CRUD modules.
- [x] Enforce derived/verified claim state for embedded metrics.
- [x] Add consistent status, sequence, featured, soft-delete, audit, cache, and File reference behavior.
- [x] Add public-only DTO projections and admin CRUD/reorder/bulk routes.
- [x] Add indexes/explain-plan checks, optimistic conflict tests, and primary-pillar coverage queries.

**Suggested commit:** `Add dynamic expertise and proof content`

### P08.2 Profile and trust content modules

**Dependencies:** P08.0

- [x] Implement TimelineEntry for experience and education with explicit type validation.
- [x] Implement Credential for certification/course/award.
- [x] Implement FAQ as a dedicated module only if cross-page reuse/query needs justify it; otherwise use a typed Page/Site list under the same publish validation.
- [x] Implement Testimonial module with verification, consent, source, relationship, and proof fields.
- [x] Implement versioned LegalDocument module.
- [x] Ensure unverified testimonials and claims are impossible to publish.
- [x] Add public DTOs, admin routes, cache, audit, File references, indexes/query budgets, optimistic conflict behavior, and tests.

**Suggested commit:** `Add dynamic profile trust and legal content`

### P08.3 Fixed-route typed Page module

**Dependencies:** P08.1–P08.2

- [x] Define a fixed route-key allowlist for Home, About, Projects, Articles, Contact, Privacy, and Terms.
- [x] Define allowlisted section registry and Zod discriminated union against the real referenced module contracts.
- [x] Add Page model with route key, locale, SEO overrides, ordered reference/layout configuration, and draft/published layout revisions.
- [x] Ensure Page snapshots do not duplicate Service/Article/Project/content bodies.
- [x] Reject arbitrary routes, component paths, scripts, unknown settings, and unrestricted HTML.
- [x] Traverse the full reference graph during publish and reject missing, deleted, private, draft, or incompatible references.
- [x] Add public/admin repository, service, controller, and routes.
- [x] Use a short-lived scoped preview session in an httpOnly cookie; do not expose preview tokens in URLs/logs/referrers.
- [x] Add reorder, visibility, curated/automatic source, and item-limit validation.
- [x] Add publish/cache/audit integration and conditional atomic revision updates.
- [x] Add indexes/query budgets and test malformed sections, graph validation, draft isolation, conflict, preview, reorder, and publish.

**Suggested commit:** `Add fixed-route typed page composition`

### P08.4 Contact inbox and dashboard domains

**Dependencies:** P02.1, P02.4

- [x] Add admin contact list/detail/status/update routes with minimal DTOs.
- [x] Add status transition rules and spam/archive behavior.
- [x] Implement contact idempotency visibility, delivery/outbox state, retry, and safe operational metadata.
- [x] Implement documented retention, scheduled purge, deletion/anonymization, and export/access flows.
- [x] Add protected AuditEvent query API/view DTO on the P06.2 foundation.
- [x] Add real dashboard aggregate service.
- [x] Test permissions, transitions, redaction, and aggregates.

**Suggested commit:** `Add contact inbox audit trail and dashboard data`

### P08.5 Published Page resolver and homepage composition

**Dependencies:** P08.1–P08.4, P07.3

- [x] Add server-only published Page and supporting-content readers.
- [x] Resolve/validate Page section references into minimal public DTOs.
- [x] Add `getHomePagePayload()` with safe parallel aggregation and partial optional-section handling.
- [x] Add bounded cache tags for pages and referenced domains using the P07.3 Next.js cache policy.
- [x] Keep draft/admin/preview readers `no-store`.
- [x] Add cross-domain post-commit invalidation and failure-retry tests.
- [x] Remove Home `force-dynamic` only later in P14 after renderer parity and performance verification.

**Suggested commit:** `Compose cached published page content`

---

## P09 — Idempotent seeds and content bootstrap

### P09.1 Seed infrastructure

**Dependencies:** P06–P08

- [x] Add seed version/checksum record.
- [x] Add per-record `seed_key`, `seed_version`, and `last_seed_hash` plus a stable-key dry-run diff.
- [x] Update a seeded record only when its current hash still matches the prior seed hash unless a deliberate safe non-production `--force` is supplied.
- [x] Add `seed`, `seed:dry-run`, `seed:demo`, and guarded `seed:reset` scripts.
- [x] Unconditionally disable `seed:demo` and `seed:reset` in production; do not provide a bypass flag.
- [x] Preserve edited records unless `--force` is explicitly provided.
- [x] Ensure super-admin bootstrap never overwrites/downgrades an existing account or logs/generated-displays the password.
- [x] Execute dependency order: admin → media → Site → categories → repeatables → projects/resources → articles → Pages.
- [x] Validate every File/reference before commit.
- [x] Reuse `ManagedMediaService` for checksum-based media staging; database transactions never pretend to include provider uploads.
- [x] Add transaction/rollback plus idempotent staged media compensation.
- [x] Test empty DB, rerun, partial prior run, edited record, provider failure, and production guard.

**Suggested commit:** `Add safe idempotent portfolio seeding`

### P09.2 Foundation seed

**Dependencies:** P09.1, verified content manifest where factual

- [x] Seed one Site singleton and default page composition.
- [x] Seed exactly five embedded pillar entries, each owning its one hero presentation; do not create a second editable HeroSlide record.
- [x] Seed required code-owned fallback visual keys and keep managed visual-dependent publication as draft until P12 attaches/validates generated Files.
- [x] Seed five draft services.
- [x] Seed twenty draft skills grouped by pillar.
- [x] Seed six process steps.
- [x] Seed only honest/derived metrics.
- [ ] Seed verified profile timeline, education, and credentials.
- [x] Seed six useful draft FAQs.
- [x] Seed legal document templates with effective dates.
- [ ] Review legal documents before production publication.
- [x] Publish no testimonial without verification and consent.

**Acceptance criteria**

- [ ] Foundation seed makes the site coherent without fabricating client proof.
- [x] Seed rerun produces no duplicates.

**Suggested commit:** `Seed the five-pillar site foundation`

### P09.3 Verified production content and demo fixtures

**Dependencies:** P09.1, P00.3 factual inventory

- [ ] Seed every verified production project/article actually available; do not create records to satisfy a numeric target.
- [ ] Include complete case-study structure and verification state for production records.
- [ ] Build clearly labelled, unpublished engineering-lab/demo fixtures toward ten projects and ten to fifteen articles for development/testing only.
- [ ] Add categories, tags, reading time, related records, and safe editorial content.
- [ ] Keep development/demo records clearly marked and non-publishable in production.
- [ ] Validate internal/external links and media references.
- [ ] Generate a primary-pillar coverage/content completeness report; secondary pillar links do not satisfy the “two examples” aspiration.

**Acceptance criteria**

- [ ] Production seed contains only verified records and may honestly contain fewer than the aspirational volume.
- [ ] Demo volume cannot cross into production publication.

**Suggested commit:** `Seed verified portfolio and insight content`

---

## P10 — Admin shell and dashboard

### P10.1 Admin information architecture

**Dependencies:** P02.4, P07–P08

- [x] Group navigation into Overview, Content, Relationships/Trust, Media, and System.
- [x] Show items by capability/role.
- [x] Remove `/admin/users` and other links until corresponding routes work, then restore deliberately.
- [x] Add real route-aware breadcrumbs and page titles.
- [x] Add environment indicator and current publish state.
- [x] Ensure every rendered navigation item reaches a working page.

**Suggested commit:** `Restructure admin information architecture`

### P10.2 Accessible admin shell

**Dependencies:** P03.3, P10.1

- [x] Build responsive desktop sidebar with persisted collapse state.
- [x] Build mobile focus-trapped drawer with Escape, backdrop, scroll lock, and restoration.
- [x] Render real user identity/role and working logout.
- [x] Remove notification bell until real notifications exist or connect it to real inbox/health data.
- [x] Add breadcrumbs, page actions, responsive content width, and skip link.
- [x] Ensure icon-only controls have names/tooltips and 44×44 targets.
- [x] Add shell loading/session-expiry/error states.

**Suggested commit:** `Rebuild the secure accessible admin shell`

### P10.3 Real dashboard

**Dependencies:** P08.4, P10.2

- [x] Replace all hardcoded statistics, recent projects, and activity.
- [x] Show published/draft totals by content type.
- [x] Show five-pillar coverage and content completeness.
- [x] Show recent inquiries/status and publish activity.
- [x] Show media completeness/provider health without exposing credentials.
- [x] Show broken link/media and stale draft warnings.
- [x] Add working navigation from every dashboard card/action.
- [x] Add loading/empty/error states and dashboard tests.

**Suggested commit:** `Replace mock admin dashboard with live data`

---

## P11 — Admin content operating system

### P11.1 Shared editorial form framework

**Dependencies:** P03.3, P10.2

- [x] Create reusable labelled admin page header, form section, sticky publish bar, shared status badge, and accessible completeness panel.
- [x] Add dirty-state detection and navigation/unload warning.
- [x] Add save draft, preview, publish, archive, restore, and conflict states.
- [x] Add field-level validation summary and focus-to-error behavior.
- [x] Add an explicit accessible slug editor and honest SEO/search/social preview with inherited fallbacks.
- [x] Add accessible reorder control with keyboard alternatives.
- [x] Add partial-failure reporting for bulk operations.
- [x] Add optimistic concurrency conflict resolution UI.

**Suggested commit:** `Build reusable admin publishing workflows`

### P11.2 Site and Page editors

**Dependencies:** P11.1, P07, P08.3

- [x] Build Site Identity/Positioning editor.
- [x] Build exactly-five Pillar editor with completeness/invariant feedback.
- [x] Build Brand/Media editor using FileUploader/File picker.
- [x] Build Contact/Availability/Social/Navigation editor.
- [x] Build SEO/OG/robots/footer/legal-link editor.
- [x] Build typed Page section ordering/visibility/source editor.
- [x] Add a structural/data preview that clearly identifies renderer-unavailable sections; final renderer-parity preview is P17.4.
- [x] Add draft/publish/conflict/cache integration tests.

**Suggested commit:** `Add Site and page administration workspace`

### P11.3 Repeatable content workspaces

**Dependencies:** P11.1, P08.1–P08.2

- [x] Add Services table/form.
- [x] Add Skills/Skill Groups table/form.
- [x] Add typed Process and Metrics editors inside the revisioned Site workspace rather than independent table CRUD, with legacy compatibility and publish-time completeness checks.
- [x] Add Experience/Education/Credentials table/forms.
- [x] Add FAQ table/form.
- [x] Add Testimonials verification/consent queue and form.
- [x] Add Legal Documents version editor.
- [x] Reuse custom DataTable selection, URL state, filters, bulk actions, and reset behavior.
- [x] Add consistent archive/trash/restore flows.

**Suggested commits**

- `Add expertise content administration`
- `Add profile trust and legal administration`

### P11.4 Media library

**Dependencies:** P06.4, P11.1

- [x] Build searchable/filterable custom DataTable/gallery view.
- [x] Show preview, dimensions, provider, size, type, source, usage count, and status.
- [x] Edit alt text, caption, focal point, attribution/license, and generated provenance.
- [x] Show all entity references before delete.
- [x] Add upload-by-purpose and provider-neutral status/errors.
- [x] Add missing metadata/content usage health filters.
- [x] Add safe archive/restore/permanent-delete flow.

**Suggested commit:** `Add managed media library and usage tracking`

### P11.5 Inbox, taxonomy, resources, reviews, and users

**Dependencies:** P10.2, P08.4

- [x] Add a capability-gated Contact inbox with redacted list rows, explicit no-store detail access, and revision-safe status actions.
- [x] Add capability-gated Article and Project category management with URL-backed remote discovery, explicit slug identity, hierarchy-safe parent choices, and complete deletion lifecycle controls.
- [x] Add capability-gated ProjectResource management with authorized project references, explicit private/public state, multi-select lifecycle actions, and truthful deleted-record projections.
- [x] Add capability-gated Review moderation with allowlisted author/target data, remote filters, on-demand detail, and bounded status actions.
- [x] Add capability-gated Users management with allowlisted account data, self/privileged-role safeguards, session-revoking access changes, and protected lifecycle actions.
- [x] Add a capability-gated, privacy-safe audit log with bounded date windows, remote filters, pagination, and no-store delivery.
- [x] Add cross-workspace page-gate, navigation, role/capability, and sensitive API authority-mapping contract tests.

**Suggested commit:** `Complete admin relationship and system workspaces`

### P11.6 Milestone verification

- [x] Run typecheck, full lint, the full unit suite, and the no-database production build at the final P11 implementation head.
- [x] Execute representative Contact, Taxonomy, ProjectResource, Review, Users, and Audit read/mutation/lifecycle paths through real route handlers, auth middleware, validation, controllers, and services with repository/session seams isolated.
- [ ] Rerun all real-Mongo integration suites against an isolated transaction-capable replica set at the final P11 head.
- [ ] Add/pass production-like authenticated admin browser coverage for sign-in, capability/direct-route denial, edit/preview/publish/conflict, media, inbox, bulk/restore, and logout; this is tracked by P20.2.

---

## P12 — Generated media production

### P12.1 Visual direction prototype

**Dependencies:** P03.1 and the canonical pillar creative brief; the About portrait decision does not block hero direction

- [ ] Create two or three compact non-human technical-editorial direction boards.
- [ ] Evaluate copy-safe area, pillar differentiation, theme compatibility, crop resilience, and originality.
- [x] Select one “Architected Intelligence” direction and lock prompt grammar.
- [x] Define forbidden motifs: people, logos, fake text/UI, robots, brains, stock keyboards, excessive neon.
- [x] Store prompt/version/provenance template.
- [x] Store the exact System Design pilot generation request and metadata checklist without claiming generated evidence.
- [x] Generate the System Design pilot candidate and record tracked asset paths, dimensions, checksums, and candidate review notes.
- [ ] Approve one pillar pilot before managed ingestion or public attachment.
- [ ] Test the pilot at desktop/mobile crops, 320–1920 widths, and both themes.
- [x] Enforce pilot media budgets: mobile hero ≤ 200 KB and desktop hero ≤ 350 KB after optimization.
- [x] Resolve seed/media engineering prerequisites for generated hero/social media: managed seed gateway construction, metadata/provenance pass-through, optional Site media bindings, and seed reference reconciliation are implemented.

**Acceptance criteria**

- [ ] One coherent direction can produce all five pillars without looking repetitive.

**Suggested commit:** `Define generated portfolio media direction`

### P12.2 Hero and identity generation

**Dependencies:** P12.1, P06.4, P07.2

- [x] Generate Frontend hero master candidate and mobile-aware crop.
- [x] Generate Backend hero master candidate and mobile-aware crop.
- [x] Generate AI Automation hero master candidate and mobile-aware crop.
- [x] Generate System Design hero master candidate and mobile-aware crop.
- [x] Generate Full-Stack hero master candidate and mobile-aware crop.
- [ ] Generate the abstract About identity visual only after the portrait decision; this does not block the five hero assets.
- [ ] Review all visuals for consistency, text-like artifacts, unintended logos, and accessibility purpose.
- [ ] Classify each visual as informative or decorative; informative media gets purposeful alt text and decorative atmosphere gets empty alt.
- [ ] Export bounded AVIF/WebP variants and blur/dominant-color metadata.
- [x] Export bounded WebP desktop/mobile candidate variants under the documented budgets.
- [ ] Ingest through the shared ManagedMediaService path used by File API/storage middleware.
- [ ] Attach alt/focal/provenance/license fields and Site/Pillar references.
- [ ] Commit a provider-neutral prompt/version/checksum/seed manifest without provider credentials or signed URLs.
- [ ] Attach generated Files to all five draft pillars, validate the publish graph, publish atomically, and invalidate/recheck the public Site.

**Suggested commit:** `Add the five-pillar generated hero media`

### P12.3 Fallback and social generation

**Dependencies:** P12.1, P06.4, P07.2

- [ ] Generate five 4:3 project fallback masters.
- [ ] Generate five 16:10 article fallback masters.
- [ ] Create default dynamic OG base at 1200×630.
- [ ] Generate optional Contact/CTA wide visual only if composition benefits.
- [ ] Optimize, ingest, annotate, and reference all assets through File/storage.
- [x] Add the Site/public pillar-keyed fallback contract and deterministic public resolution path for future managed project/article fallback media.
- [ ] Map managed pillar fallbacks while retaining the code-owned emergency visual for DB/provider outage.
- [ ] Remove legacy Unsplash dependencies after public parity.
- [ ] Replace the bloated embedded-raster SVG with a lean, intentional brand asset.

**Suggested commit:** `Add generated fallbacks and social media system`

---

## P13 — Public shell and five-slide hero

### P13.1 Header and mobile navigation

**Dependencies:** P03–P04, P07

- [x] Source brand, canonical line, navigation, availability, resume, and CTA from Site.
- [x] Remove “Application Developer” and duplicated nav arrays.
- [x] Build semantic active navigation and section behavior without fragile duplicated state.
- [x] Add accessible mobile dialog behavior.
- [x] Fix focus styles, labels, touch targets, and body scroll restoration.
- [x] Render resume only when a valid managed File/URL exists.
- [x] Add resilient Site fallback and tests.

**Suggested commit:** `Rebuild the dynamic accessible public header`

### P13.2 Footer and global shell

**Dependencies:** P13.1

- [x] Source positioning, contact, socials, availability, legal, and copyright from Site.
- [x] Remove duplicated/hardcoded contact values and nested interactive controls.
- [x] Add skip link, main landmark contract, motion toggle, and improved scroll-to-top behavior.
- [x] Delay non-critical global client scripts.
- [x] Add footer loading/fallback behavior and tests.

**Suggested commit:** `Rebuild the dynamic public shell and footer`

### P13.3 Five-slide hero

**Dependencies:** P04.3–P04.4, P07.2–P07.3, P12.2

- [x] Render exactly five canonical slides from published Site/Pillar data.
- [x] Implement copy-safe responsive composition and stable height.
- [x] Use optimized managed media when available and deterministic code-owned fallbacks otherwise; priority only the active LCP image.
- [ ] Verify the initial network requests only the active hero image; prefetch at most one next image after idle.
- [x] Add labelled direct controls, previous/next, keyboard, and touch behavior.
- [x] Add visible pause/play, hover/focus/visibility pause, and timer cleanup.
- [x] Add meaningful layered parallax through the shared engine.
- [x] Add static/opacity-only reduced-motion variant with autoplay disabled.
- [x] Ensure reduced motion has no automatic entrance movement.
- [x] Announce manual slide changes without noisy autoplay announcements.
- [x] Remove Unsplash/raw images and index keys.
- [x] Test missing media, missing Site, malformed data, and invariant failures.
- [x] Test all five deterministic active-slide states without depending on live autoplay timing.

**Acceptance criteria**

- [x] Exactly five slides appear in canonical order.
- [x] Hero remains complete with reduced motion and without JavaScript animation.
- [ ] Only one hero image is requested at high priority.

**Verification**

- [ ] Component/E2E/a11y tests.
- [ ] Mobile/desktop network and frame profiling.
- [ ] Run typecheck, lint, and build.

**Suggested commit:** `Build the accessible five-pillar parallax hero`

---

## P14 — Proof-driven homepage

### P14.1 Homepage server composition

**Dependencies:** P08.5 and typed fixtures; verified P09 production records are a launch dependency, not a renderer-development blocker

- [x] Use cached `getHomePagePayload()` with public DTOs.
- [x] Remove unnecessary force-dynamic behavior after verification.
- [x] Render primary content server-side.
- [x] Replace blank Suspense boundaries with contextual skeletons.
- [x] Use the framework-cached published payload and hide/fallback optional failed sections without inventing a custom stale-content store.
- [x] Ensure section order/visibility comes from the typed Page record.

**Suggested commit:** `Serve cached dynamic homepage content`

### P14.2 Proof and five-pillar narrative

**Dependencies:** P14.1, P04.3

- [ ] Build verified proof/availability strip from derived/verified metrics.
- [ ] Build sticky five-pillar capability section.
- [ ] Keep its purpose distinct from the hero: hero communicates positioning/outcomes; this section communicates technical depth, relationships, and evidence.
- [ ] Use shared parallax to explain depth/relationships without excessive travel.
- [ ] Link every pillar to relevant projects/articles/services.
- [ ] Replace hardcoded generic service/skill repetition.
- [ ] Provide reduced-motion linear presentation.

**Acceptance criteria**

- [ ] All five pillars appear once in canonical order with real linked proof when available.
- [ ] Sticky behavior never traps scroll, overlaps the header, or fails to release at section boundaries.
- [ ] No-JS/reduced-motion presentation is an equivalent readable linear narrative.

**Suggested commit:** `Create the five-pillar homepage narrative`

### P14.3 Case studies and technical demonstrations

**Dependencies:** P14.1 and typed fixtures; only verified/clearly labelled records may render publicly

- [ ] Show three to five strongest case studies with problem, role, architecture, and verified outcome.
- [ ] Add one understandable system-design architecture story.
- [ ] Add one understandable AI-automation workflow story with data/human-control boundaries.
- [ ] Provide complete DOM-text alternatives and keyboard-safe controls; no canvas/image-only diagram may carry essential meaning.
- [ ] Add purposeful case-study media parallax.
- [ ] Never show live/source controls without valid visible URLs.
- [ ] Add related insight links.

**Suggested commit:** `Add case study and engineering proof experiences`

### P14.4 Process, insight, trust, and CTA

**Dependencies:** P14.1

- [ ] Render concise dynamic process steps.
- [x] Render selected articles with meaningful metadata and optimized media.
- [ ] Render verified testimonials only; otherwise use evidence-based proof alternative.
- [ ] Render useful FAQs from published records.
- [x] Build qualification-focused CTA using dynamic availability/contact data.
- [x] Remove contradictory hardcoded metrics and generic testimonial data.
- [ ] Verify the final section rhythm is intentional, not a repeated card-grid chain.

**Suggested commit:** `Complete the proof-driven homepage journey`

---

## P15 — Projects experience

### P15.1 Project discovery

**Dependencies:** P06.3, typed fixtures or verified P09 content, P03.3

- [x] Server-render initial project grid.
- [x] Adopt the P01.3 URL query-state/search/debounce/abort primitives for pillar, technology, type, year, and sort filters.
- [x] Add bounded pagination and an accessible responsive filter drawer.
- [x] Add loading, empty, error/retry, stale, and no-filter-match states.
- [x] Build case-study cards with type, safe public role projection, pillar, stack, and verified outcome.
- [x] Use optimized media and pillar fallbacks.
- [x] Add keyboard/a11y and browser-history tests.

**Suggested commit:** `Upgrade project discovery and filtering`

### P15.2 Project detail

**Dependencies:** P15.1, P07.4

- [x] Switch to slug route and legacy ID redirect.
- [x] Render real 404 for missing/non-public projects.
- [x] Build overview/problem/constraints/role/architecture/decisions/implementation sections.
- [x] Add security, reliability, performance, outcome, stack, learnings, gallery, and related work.
- [x] Add safe editorial rendering and optional TOC.
- [x] Add optimized gallery/lightbox with captions/focal points.
- [x] Render live/source/resource links only when valid and public.
- [x] Add subtle case-study media parallax and reduced-motion fallback.
- [x] Remove duplicate project detail implementation.
- [x] Add dynamic metadata, OG, schema, breadcrumbs, and canonical.

**Suggested commit:** `Turn project details into technical case studies`

---

## P16 — Articles experience

### P16.1 Article discovery

**Dependencies:** P06.3, typed fixtures or verified P09 content

- [x] Server-render initial featured/list content.
- [x] Adopt the P01.3 URL query-state/search/debounce/abort primitives for pillar/category/topic and sort filters.
- [x] Add bounded pagination and accessible filter controls.
- [x] Show excerpt, pillar, reading time, published/updated date, and author.
- [x] Use optimized media and pillar fallbacks.
- [x] Add tests for query state, visibility, error, and browser history.

**Suggested commit:** `Upgrade article discovery and filtering`

### P16.2 Editorial article detail

**Dependencies:** P16.1, P02.2, P07.4

- [x] Switch to slug route and legacy ID redirect.
- [x] Render real 404 for missing/non-public/expired content.
- [x] Render safe editorial body with anchors, TOC, code, copy-code, tables, captions, and reading progress if useful.
- [x] Add working native share and copy-link fallback.
- [x] Add author/profile data from Site safe DTO.
- [x] Add related articles by pillar/topic.
- [x] Remove duplicate article detail implementation.
- [x] Add dynamic metadata, OG, Article schema, breadcrumbs, and canonical.
- [x] Test sanitization, expiry, share fallback, and keyboard behavior.

**Suggested commit:** `Build the secure editorial article experience`

---

## P17 — About, Contact, and Legal

### P17.1 About narrative

**Dependencies:** P08.2, P07.4, typed fixtures; verified P09 content and the selected P12.2 identity asset are launch dependencies

- [ ] Source positioning, bio, identity media, principles, timeline, education, and credentials dynamically. All listed data except the principles/process narrative is wired.
- [x] Build evidence-led five-pillar skill map.
- [x] Remove generic “PART OF NATURE,” template phrasing, and duplicated Home sections.
- [x] Use a genuine portrait only if approved; otherwise use the abstract identity visual.
- [x] Render resume/contact actions only when valid.
- [ ] Add route states, metadata, schema, and responsive/a11y tests. Route states/metadata/schema exist; dedicated responsive/a11y evidence remains.

**Suggested commit:** `Rebuild About around verified professional evidence`

### P17.2 Contact experience

**Dependencies:** P02.1, P07, P07.4, P08.4

- [x] Source contact/social/location/availability/response promise from Site.
- [x] Recompose page around project fit and a concise accessible form.
- [ ] Add optional engagement/timeline/budget fields only if useful and privacy-reviewed.
- [x] Remove the automatic map iframe and retain no third-party frame/consent surface.
- [x] Treat iframe title/consent/keyboard handling as not applicable because the map iframe was removed.
- [x] Add successful submission reference/status without leaking internal IDs.
- [ ] Test normal, slow, offline, validation, rate limit, retry, and provider-failure paths.

**Suggested commit:** `Rebuild the client-focused contact experience`

### P17.3 Legal pages

**Dependencies:** P08.2, P07.4

- [x] Render published versioned Privacy and Terms documents.
- [x] Show effective date, revision, and contact owner.
- [x] Document contact-data purpose, retention, access/export, deletion/anonymization, and purge behavior in the reviewed privacy copy.
- [x] Add safe editorial rendering and print/readability styles.
- [x] Add metadata/canonical and route fallback behavior.
- [x] Remove duplicated hardcoded email/legal text after parity.

**Suggested commit:** `Move legal content into versioned site records`

### P17.4 Public-renderer preview parity

**Dependencies:** P11.2 and completed public renderers from P13–P17

- [ ] Reuse the real public section renderers in authenticated preview rather than maintaining visual duplicates.
- [ ] Support desktop/mobile widths, light/dark themes, and normal/reduced motion.
- [ ] Keep preview sessions scoped, short-lived, httpOnly, no-store, and `noindex`.
- [ ] Show draft reference/validation errors without exposing private data to public routes.
- [ ] Add parity tests comparing published and preview rendering for the same snapshot.

**Suggested commit:** `Complete public-renderer admin preview parity`

---

## P18 — SEO, images, and performance hardening

### P18.1 Metadata and structured data

**Dependencies:** P07.4, public page parity

- [ ] Audit every indexable page consumes the P07.4 metadata/canonical foundation.
- [ ] Complete unique page-specific title/description/canonical/social inputs. Home, About, discovery, details, and legal use the shared builder; Contact and Page-renderer parity remain.
- [ ] Add dynamic project/article 1200×630 OG routes and valid default social image.
- [x] Add Twitter metadata parity through the shared metadata builder; generated route-specific social images remain pending.
- [ ] Add `robots.ts`, `sitemap.ts`, manifest, icon, and apple icon. Robots, sitemap, and manifest exist; final icon/apple-icon assets remain.
- [x] Verify the central `noindex` policy on admin/auth/preview/error-only surfaces.
- [ ] Add truthful `Person`, `WebSite`, `ProfessionalService`, `BreadcrumbList`, `Article`, and `CreativeWork` data where supported. WebSite, breadcrumbs, Article, CreativeWork, and scoped Person are complete; standalone ProfessionalService awaits a supported truthful contract.
- [x] Validate schema builders against rendered content and remove unsupported claims.
- [x] Add canonical/404/legacy redirect tests.

**Suggested commit:** `Complete dynamic metadata and structured data`

### P18.2 Image/font/network optimization

**Dependencies:** P12, public page parity

- [ ] Replace remaining raw content `<img>` with the media primitive/`next/image`.
- [ ] Add exact `sizes`, dimensions/aspect ratio, lazy/priority behavior, and safe remote path patterns.
- [ ] Ensure only active hero image is initially prioritized.
- [ ] Optimize/remove 932 KB profile PNG according to final portrait decision.
- [x] Replace/remove the 1.6 MB embedded-raster logo SVG.
- [x] Remove unused Unsplash remote pattern after migration.
- [ ] Subset/self-host fonts and remove unused weights.
- [ ] Delay GitHub calendar, map, tooltips, and other non-critical third-party code.
- [ ] Audit bundle/chunks and remove unused dependencies/duplicate client components.

**Suggested commit:** `Optimize portfolio media fonts and third-party loading`

### P18.3 Rendering and Core Web Vitals

**Dependencies:** P18.2, P08.5

- [ ] Measure route-level initial JS and transfer size.
- [ ] Compare against the pinned P00.5 baseline using the same Lighthouse/Chrome version, route data, device/network/CPU profile, and warm/cold cache state.
- [ ] Convert unnecessary client components to Server Components.
- [ ] Isolate interactive islands.
- [ ] Verify tagged caching and publish invalidation under load.
- [ ] Reduce large blur/composited layers and expensive `transition-all` usage.
- [ ] Profile motion/parallax long tasks and memory cleanup.
- [ ] Eliminate avoidable layout shifts and reserve skeleton/media dimensions.
- [ ] Meet or document pre-launch lab exceptions for LCP/interaction/CLS evidence and TTFB ≤ 800 ms; do not represent field p75 as proven before sufficient RUM traffic.
- [ ] Reach median-of-three Lighthouse Performance ≥ 90 and public initial JS ≤ 180 KB gzip under the pinned profile.
- [x] Add Lighthouse CI budgets.

**Suggested commit:** `Meet portfolio performance and rendering budgets`

---

## P19 — Security, accessibility, and observability hardening

### P19.1 Security headers and abuse review

**Dependencies:** public/admin parity, P02

- [x] Inventory external scripts/styles/images/frames/connect destinations.
- [ ] Add CSP in report-only mode with a reporting path/provider.
- [ ] Resolve violations; remove avoidable inline script/style needs.
- [x] Enforce CSP with scoped directives and `frame-ancestors`.
- [x] Add/refine content type, referrer, permissions, and frame protections.
- [x] Configure production HSTS headers for HTTPS edge deployment.
- [x] Recheck CSRF/origin/fetch-metadata, rate limits, cookie attributes, URL allowlists, and DTOs.
- [ ] Run dependency vulnerability and secret scans.
- [x] Conduct the implemented authorization/capability matrix tests; final browser matrix remains in P20.
- [x] Record threat model and accepted risks.

**Suggested commit:** `Harden portfolio browser and API security`

### P19.2 Accessibility conformance pass

**Dependencies:** all public/admin experiences

- [ ] Run automated axe across key public/admin routes in both themes.
- [ ] Reach zero critical/serious findings.
- [ ] Target Lighthouse Accessibility ≥ 95.
- [ ] Manual keyboard-only pass including menus, hero, filters, dialogs, editor, upload, DataTable, and contact.
- [ ] Screen-reader smoke pass for landmarks, headings, slider, forms, tables, status, and errors.
- [ ] Verify 44×44 targets and contrast.
- [ ] Verify 200%/400% zoom and reflow.
- [ ] Verify reduced motion and motion toggle across every animated surface.
- [ ] Verify no flash/strobe risk and automatic motion has pause controls.
- [ ] Document remaining exceptions with owner and follow-up.

**Suggested commit:** `Complete portfolio accessibility conformance pass`

### P19.3 Observability

**Dependencies:** privacy decision, deployment configuration

- [x] Add correlation IDs and structured redacted server logs.
- [ ] Add client/server exception reporting with release/source maps.
- [x] Add privacy-safe, disabled-by-default LCP/INP/CLS capture by coarse route/device/release; production sampling remains unconfigured.
- [ ] Measure API latency/error rate and database timings.
- [ ] Add contact delivery and upload-provider failure alerts.
- [ ] Add synthetic Home/detail/sign-in/contact checks.
- [ ] Add content/media health job for broken links, missing files, and alt metadata; protect external checks from SSRF by blocking private/link-local targets, unsafe protocols/redirects, oversized bodies, and long timeouts.
- [x] Define RUM reporting as a rolling 28-day window with at least 200 eligible samples per route cohort; otherwise report insufficient data.
- [x] Define dashboards and post-launch objectives using a rolling 30-day window, valid-request denominator, route classes, deployment region, warm/cold split, and concurrency profile: 99.9% availability, API p95 ≤ 400 ms, server errors < 1%.
- [x] Document data retention and ensure form/private content is never captured.

**Acceptance criteria**

- [x] Provider selection is documented before integration; observability vendor work does not block core release when configuration is unavailable.
- [x] No private form/client content is captured by the implemented logs, CSP reports, Web Vitals path, or error payloads.

**Suggested commit:** `Add privacy-safe portfolio observability`

---

## P20 — Final QA, content approval, and launch

### P20.1 Cross-device visual regression

**Dependencies:** all UI milestones

- [ ] Capture Home, About, Projects, project detail, Articles, article detail, Contact, Admin dashboard, Site editor, and one table/form flow.
- [ ] Cover 360, 768, 1280, and 1536 viewports.
- [ ] Cover light/dark and normal/reduced motion.
- [ ] Capture deterministic hero slides 1–5 and scroll-progress states 0/0.5/1 without live autoplay timing.
- [ ] Check 320, 375, 1024, 1440, and 1920 manually for overflow/layout anomalies.
- [ ] Cover latest-two desktop Chrome/Firefox/Safari/Edge plus current/previous-major iOS Safari and current Android Chrome per the support ADR.
- [ ] Verify safe-area insets, mobile browser chrome, `100dvh`, and 200%/400% reflow.
- [ ] Review image crops, focal points, type wrapping, sticky/parallax boundaries, focus, skeletons, empty/error states, and print/legal layout.
- [ ] Approve visual diffs intentionally.

### P20.2 End-to-end acceptance

- [ ] Public navigation, five-slide hero, motion toggle, search/filter, detail, share, resume, and contact pass.
- [ ] Admin sign-in, permissions, draft, preview, publish, conflict, media, inbox, bulk actions, restore, logout pass.
- [ ] Cloudinary upload/reference/delete flow passes.
- [ ] GCP upload/reference/delete flow passes when credentials/test environment are available.
- [ ] Existing-provider file deletion works after provider switching.
- [ ] Cache invalidation shows newly published content without exposing drafts.
- [ ] Broken/missing backend/media/provider scenarios show intended fallbacks.
- [ ] No dead links, inert buttons, fake success, or placeholder client claims remain.

### P20.3 Content and SEO approval

- [ ] Review every page for canonical five-pillar consistency.
- [ ] Verify names, dates, roles, clients, metrics, testimonials, contact, resume, and external URLs.
- [ ] Verify at least two strong project/article examples per pillar or document an honest launch exception.
- [ ] Verify generated media provenance, alt text, and no unintended text/logo/person artifacts.
- [ ] Validate sitemap, robots, canonical, OG/Twitter, structured data, and social previews.
- [ ] Verify admin/auth/preview are not indexed.
- [ ] Remove or archive all demo/unverified production records.

### P20.4 Performance/security/reliability release gate

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] All unit/component/integration/E2E/a11y/visual tests pass.
- [ ] `pnpm build` passes in a production-like environment.
- [ ] Lighthouse/performance budgets pass or exceptions are explicitly approved.
- [ ] No known critical/high security issue remains.
- [ ] Backup and migration rollback/forward-fix plan is rehearsed.
- [ ] Environment variables, storage, database, mail, CSP, monitoring, and alerting are configured.
- [ ] Smoke test production after deployment.
- [ ] Confirm rollback path before announcing launch.

**Suggested final commits**

- `Polish portfolio across devices and motion modes`
- `Verify production content and launch readiness`

---

## Deferred ideas — only after the core release

These are not permitted to distract from the main roadmap:

- [ ] Bangla localization using the same typed content/revision architecture.
- [ ] Private client case-study access.
- [ ] Interactive architecture playgrounds beyond the two core proof demos.
- [ ] Newsletter/RSS subscription workflow.
- [ ] Admin command palette and advanced notification center.
- [ ] A/B testing or personalization, only with a privacy/measurement plan.
- [ ] Additional storage provider adapters.

## Current next action

1. Preserve the reviewable P11 implementation boundary through `7b7b2cf`; keep its real-Mongo rerun and authenticated browser matrix explicitly open for P20.2.
2. Complete **P12** generated non-human media through the shared managed-media path, next approving the hero candidate set, extracting metadata, then ingesting/attaching through managed media.
3. Finish **P14**, **P17**, **P18**, and **P19**, then run **P20**, including the full authenticated admin browser matrix.
4. Keep production publication blocked for any claim/media/contact item that still lacks owner verification or credentials.
