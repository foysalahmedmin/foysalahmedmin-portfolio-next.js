# Fixed-route Page composition

The Page domain stores layout configuration for exactly nine public routes: `home`, `about`, `projects`, `case-studies`, `articles`, `videos`, `contact`, `privacy`, and `terms`. Route keys, section kinds, layouts, filters, and source modes are code-owned allowlists. A Page never accepts arbitrary component paths, scripts, HTML, or new public routes.

## Ownership boundary

Page snapshots contain SEO overrides, ordering, visibility, layout names, item limits, automatic filters, and curated object IDs. They do not copy Project, Article, Service, SkillGroup, TimelineEntry, Credential, FAQ, Testimonial, or LegalDocument bodies. Public curated sources are projected to stable `{ domain, slug }` references; downstream page resolution remains responsible for fetching each domain's public DTO.

Draft and published layouts are isolated. Draft changes use a required `expected_revision` and an atomic compare-and-swap update that increments the revision. Publish uses the same expected revision, creates an immutable published snapshot, and rejects republishing an unchanged revision.

## Section kinds, layouts and the route matrix

Six kinds were added for the problem-first home page (plan 5.2). Two of them
(`problem-index` and the collection kinds) read repeatable records; the rest
read the Site singleton and are system sections.

| Kind                  | Source                        | Layouts                 | Reads                                   |
| --------------------- | ----------------------------- | ----------------------- | --------------------------------------- |
| `problem-index`       | automatic or curated Services | `default`               | `Service.problems`                      |
| `engagement-models`   | system                        | `default`               | `Site.engagement_models`                |
| `commitments`         | system                        | `default`, `principles` | `Site.commitments` or `Site.principles` |
| `deliverable-samples` | system                        | `default`               | `Site.deliverable_samples`              |
| `fit-check`           | system                        | `default`               | `Site.fit`                              |
| `starting-point`      | system                        | `default`               | `Site.finder`                           |

New layouts on existing kinds: `site-hero:topology`, `service-collection:stack`,
`architecture-workflow:pipeline`, `case-study-collection:files`,
`skill-group-collection:registry`, `process-steps:wire`,
`metrics-strip:evidence` and `article-collection:notes`. The public renderer
ignores a kind or layout it cannot draw, so a draft may use them before the
visuals exist. A section with no public data hides itself.

`PAGE_ROUTE_SECTION_KINDS` restricts which kinds each route accepts:

| Route              | Accepted kinds                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home`             | `site-hero`, `metrics-strip`, `pillar-showcase`, `architecture-workflow`, `service-collection`, `skill-group-collection`, `project-collection`, `case-study-collection`, `video-collection`, `article-collection`, `process-steps`, `testimonial-collection`, `github-profile`, `faq-list`, `contact-cta`, `problem-index`, `deliverable-samples`, `engagement-models`, `commitments`, `fit-check`, `starting-point` |
| `about`            | `site-introduction`, `pillar-showcase`, `service-collection`, `architecture-workflow`, `skill-group-collection`, `project-collection`, `case-study-collection`, `timeline`, `credential-collection`, `testimonial-collection`, `process-steps`, `github-profile`, `faq-list`, `contact-cta`, `commitments`, `fit-check`                                                                                              |
| `projects`         | `project-collection`, `contact-cta`                                                                                                                                                                                                                                                                                                                                                                                  |
| `case-studies`     | `case-study-collection`, `contact-cta`                                                                                                                                                                                                                                                                                                                                                                               |
| `articles`         | `article-collection`, `contact-cta`                                                                                                                                                                                                                                                                                                                                                                                  |
| `videos`           | `video-collection`, `contact-cta`                                                                                                                                                                                                                                                                                                                                                                                    |
| `contact`          | `contact-form`, `faq-list`                                                                                                                                                                                                                                                                                                                                                                                           |
| `privacy`, `terms` | `legal-document`                                                                                                                                                                                                                                                                                                                                                                                                     |

### Seed version 8 home draft

The foundation seed composes the home page as 19 sections in the order of the
plan (4.1): hero (`topology`), evidence strip, triage, stack, pipeline, case
files, deliverables, process (`wire`), engagement, fit check, finder, capability
stack, commitments, testimonials, GitHub, "How I think", field notes, FAQ and
the contact band. The fit check, the finder and "How I think" are composed but
hidden (`visible: false`) until the owner confirms their copy; About gains the
same hidden "How I think" and fit-check sections. The old `pillars`,
`projects`, `videos` and `reels` sections leave the home draft (their routes are
unchanged), which also keeps the draft under the 20-section limit.

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

## Home chapters (Phase 5)

The home draft lists the sixteen chapters of plan section 4.1 in order. `pillars` is present but `visible: false` (the hero and the Stack present the same three roles, and the home has a 24-screen budget); switch it on in the Pages editor to bring the stacked role panels back. `fit`, `finder` and `principles` are also hidden until their copy is confirmed. A section whose data is empty or not public renders nothing. Layout names a stored Page may still carry (`numbered`, `default` on `process-steps`) render the wire.
