# Site settings and six-pillar contract

The `Site` domain is the singleton authority for public identity, positioning,
navigation, contact visibility, social links, SEO defaults, experience defaults,
fallback media, and the five portfolio pillars. The singleton key is `primary`;
code and the database both use contract version `1`.

## Editorial state

`draft` is editable and may be incomplete. Every draft PATCH includes
`expected_revision`; the repository performs one conditional update on
`{ site_key: "primary", revision: expected_revision }` and increments the
revision. A stale request receives `409 SITE_VERSION_CONFLICT` with the current
revision and never overwrites newer work.

`published` is a bounded copy of the complete draft plus its revision,
publication timestamp, and publisher. Publication, File reference reconciliation,
the audit event, and the durable cache-invalidation intent share one MongoDB
transaction. Public readers never read `draft` and therefore continue to receive
the previous complete publication while a draft is edited or a transaction fails.

## Canonical pillars

The ordered keys are code-owned:

1. `frontend`
2. `backend`
3. `ai_automation`
4. `system_design`
5. `full_stack`

Each stored pillar keeps its stable key/order/label/fallback visual plus its
headline, summary, client outcome, capabilities, technologies, CTA, icon,
accent, optional managed visual, alt/decorative policy, enabled state, and SEO
summary. Drafts retain all five entries even when disabled or incomplete.
Publishing requires exactly five enabled, complete entries in canonical order.
The emergency response is generated from the same versioned tuple and contains
no editable or fabricated personal identity.

## File graph

Site snapshots store File IDs, never provider keys or signed URLs. Draft saves
require every referenced File to be ready, active, undeleted, and compatible
with the field's exact purpose. Publication additionally requires public access,
complete editorial metadata, and a public delivery URL. A missing, private,
incomplete, deleted, processing, or purpose-incompatible File blocks the whole
publication with field paths; partial publication is impossible.

Files carry separate `draft` and `published` references to the Site. Replacing a
draft asset cannot remove the protection held by the last publication.

Project and article fallbacks support sparse, canonical six-pillar maps through
`project_files_by_pillar` and `article_files_by_pillar`. Only `frontend`,
`backend`, `ai_automation`, `system_design`, and `full_stack` are valid keys.
The legacy generic `project_file` and `article_file` fields remain supported for
older snapshots and content without a pillar. Missing maps normalize to `{}` so
schema-version `1` draft and published snapshots remain readable without a data
migration. File reference collection visits each canonical pillar in contract
order and validates mapped assets against the `project` or `article` purpose.

The public DTO exposes the projected maps as `project_by_pillar` and
`article_by_pillar`; each value contains only safe public rendering metadata.
Resolution is deterministic: explicit content media, then the matching managed
pillar fallback, then the legacy generic managed fallback. When none exists, the
rendering component owns the final code-bundled SVG fallback.

## API and capabilities

- `GET /api/site` returns the minimal published DTO or the compile-time emergency
  DTO. It never returns revision internals beyond `published_revision`, draft,
  publisher identity, SEO verification values, hidden contact values, provider
  metadata, checksums, or provenance.
- `GET /api/site/admin` requires `site:read` and is `no-store`.
- `POST /api/site/admin` creates the singleton and requires `site:edit`.
- `PATCH /api/site/admin` updates draft with `expected_revision` and requires
  `site:edit`.
- `POST /api/site/admin/publish` publishes with `expected_revision` and requires
  `site:publish`. Editors can edit but cannot publish.

All Site endpoints reject arbitrary query projection. Mutation bodies are strict,
bounded JSON. Responses carry a generated `X-Request-Id`; production errors use
stable codes and omit stacks, database errors, request values, and provider data.

## Cache policy

Published server reads use Next.js `unstable_cache` with the bounded tag
`portfolio:v1:site` and a one-hour revalidation ceiling. Route Handler
invalidation uses `revalidateTag(tag, "max")`; `updateTag` is not used. Home
layout and `/api/site` paths are revalidated only after transaction commit.
Framework invalidation failure leaves the committed publication valid, records a
safe retry state in `site_cache_invalidations`, and can be retried through
`retryPendingSiteCacheInvalidations`.

Admin/draft reads are always private `no-store`. If there is no cached published
Site and the database reader is unavailable, the server-only reader returns the
minimal code-owned emergency contract without caching a custom stale copy.
