# Fixed-route Page composition

The Page domain stores layout configuration for exactly seven public routes: `home`, `about`, `projects`, `articles`, `contact`, `privacy`, and `terms`. Route keys, section kinds, layouts, filters, and source modes are code-owned allowlists. A Page never accepts arbitrary component paths, scripts, HTML, or new public routes.

## Ownership boundary

Page snapshots contain SEO overrides, ordering, visibility, layout names, item limits, automatic filters, and curated object IDs. They do not copy Project, Article, Service, SkillGroup, TimelineEntry, Credential, FAQ, Testimonial, or LegalDocument bodies. Public curated sources are projected to stable `{ domain, slug }` references; downstream page resolution remains responsible for fetching each domain's public DTO.

Draft and published layouts are isolated. Draft changes use a required `expected_revision` and an atomic compare-and-swap update that increments the revision. Publish uses the same expected revision, creates an immutable published snapshot, and rejects republishing an unchanged revision.

## Publish graph

Publication traverses every referenced collection section and fails closed when a record is missing, deleted, disabled, unpublished, scheduled for the future, private, trust-ineligible, category/author-ineligible, or backed by an invalid public File. The validator calls each repeatable domain's real publish contract. Skill groups additionally require at least one publicly eligible, pillar-compatible Skill. Privacy and Terms can only select the matching reviewed LegalDocument type.

The snapshot budget is 64 KiB, with at most 20 sections and 24 records per collection section (480 primary graph records). Queries use deterministic limits and indexes; no unbounded projection or arbitrary public query parameters are exposed.

## APIs and authorization

- `GET /api/pages/:routeKey` returns only a published public composition and uses bounded CDN caching.
- `GET|POST|PATCH /api/pages/:routeKey/admin` reads, creates, or updates a draft. Read requires `site:read`; writes require `site:edit`.
- `POST /api/pages/:routeKey/admin/reorder` requires an exact section-key permutation and `site:edit`.
- `POST /api/pages/:routeKey/admin/publish` requires `site:publish`.
- `POST|DELETE /api/pages/:routeKey/admin/preview-session` creates or clears a preview capability and requires `site:read`.
- `GET /admin/preview/pages/:routeKey` is the private renderer document and requires both an authenticated `site:read` principal and the route-scoped preview cookie. There is no separate draft-data preview API.

All browser mutations require a trusted same-origin request. Admin and preview responses are private `no-store`; preview responses also send `X-Robots-Tag: noindex, nofollow, noarchive` and `Referrer-Policy: no-referrer`.

## Preview and caching

Preview capability data is HMAC-authenticated, expires within 60–900 seconds (600 by default), is scoped to one route/revision, and is delivered only in an `httpOnly`, `SameSite=Strict`, production-`Secure` cookie whose path is the matching private renderer document. No preview token appears in a URL, response body, audit metadata, or referrer.

The live routes and private preview share one route-aware renderer for all seven fixed Page keys. Page composition owns section visibility and order. Projects and Articles preserve their interactive discovery interface through a typed collection-section override; at the default query, both live and preview initialize from the same resolved Page snapshot. Contact and Legal routes also resolve through Page, including bounded no-database fallbacks.

Publishing writes a durable cache-invalidation intent in the same transaction as the snapshot and audit event. Delivery invalidates global and route-specific tags plus only the fixed route/API paths. Failed delivery leaves a bounded retry intent; delivered intents expire after seven days.

## Configuration and migration

Set a distinct, server-only `PAGE_PREVIEW_SECRET` of at least 32 characters in production. `PAGE_PREVIEW_TTL_SECONDS` defaults to 600 and is clamped to the documented range.

Migration `202607150013-page-composition` creates the Page singleton, public-read, admin-order, and durable invalidation indexes. It is non-destructive and does not seed layouts or portfolio claims. Existing invalid/duplicate documents require explicit remediation.

The server-only published resolution, section-health, query-budget, and cross-domain cache contract is documented in [Published Page resolver](./published-page-resolver.md).
