# Site settings and three-role contract

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

Project and article fallbacks support sparse, canonical three-role maps through
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

## Problem-first fields (plan 5.2, seed version 8)

Every field below is optional or defaults to empty, so earlier drafts and
published snapshots stay readable. Each list is capped, and the 256 KB snapshot
limit stays far away.

| Field                                      | Limit                             | Meaning                                                                                                                |
| ------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `positioning.headline`                     | 90 characters                     | The page `h1`, for example "Business problems in. Reliable systems out."                                               |
| `contact.working_hours`                    | 160 characters                    | Optional working-days line; unset until the owner supplies it (C-33).                                                  |
| `metrics[].source_slug`, `metrics[].as_of` | slug, `YYYY-MM-DD`                | The case study a value comes from and the day it was measured.                                                         |
| `engagement_models`                        | 4                                 | Name, best-when, what you get, how it runs, optional duration and price label, `verification`, `enabled`.              |
| `commitments`                              | 6                                 | Method statements: a title and one line.                                                                               |
| `workflow_example`                         | 2 to 8 nodes                      | The illustrative automation flow (`illustrative` is always `true`) with a failure line per node and a switch-off line. |
| `deliverable_samples`                      | 6, excerpt up to 1,200 characters | Plain-text excerpts of real artifacts, with a source label, an optional case-study slug and a `verification`.          |
| `next_steps`                               | 4                                 | The ordered steps after an enquiry.                                                                                    |
| `fit`, `principles`, `finder`              | 6 segments, 6 principles, 4 steps | Tier 2: who the work is for, "How I think", and the starting-point rules (evaluated in the browser).                   |

### Publish rules

`getSitePublishIssues` rejects a publication when:

- an enabled engagement model is `unverified`, or has no `best_when`, `you_get` or `how_it_runs`;
- any engagement model carries a `price_label` without `verification: "verified"`;
- an enabled deliverable sample is `unverified`;
- the fit check is enabled with no segments;
- the finder is enabled with no steps or outcomes, an outcome points at a model that is not enabled, or a rule uses a tag no option offers;
- an enabled metric has no value or is `unverified`, or metrics are switched on and none qualifies.

### Public DTO

`GET /api/site` keeps the draft out and applies the same gates again:

- engagement models appear only when enabled and not `unverified`; a price is included only when the model is `verified`;
- deliverable samples appear only when enabled and not `unverified`;
- metrics appear only when the `show_metrics` flag is on, the metric is enabled, not `unverified`, and its `as_of` is not older than 180 days (`SITE_METRIC_FRESH_DAYS`); a metric with no `as_of` never expires;
- commitments, principles and next steps are filtered by `enabled`; `fit` and `finder` appear only when enabled; the workflow example is always included.

### Seed version 8 content

The foundation seed fills these fields as a draft (`src/lib/seed/foundation-site-content.ts`). Nothing that depends on an unconfirmed owner fact is switched on:

- **On:** the headline, five derived metrics (migrations applied from an empty database, redeploys needed to change public content, and the three structural counts), five method commitments (no "You own the code", C-16), the illustrative workflow, three next steps.
- **Off and unverified:** the three engagement models (no price, no duration; "how it runs" and, for the partnership, "you get" left empty, C-13 to C-15).
- **Off:** the fit check (C-32), the finder (C-13), the principles (C-18), and every deliverable sample (derived from this repository, pending redaction approval, C-31).
- **Unset:** `contact.working_hours` (C-33). `experience.theme` is `dark`.

Each of these has a claim in `docs/content/content-truth.v1.json` (version 1.1.0), and `tests/unit/content-truth-gate.test.ts` fails when an enabled, not-unverified record has none.

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
