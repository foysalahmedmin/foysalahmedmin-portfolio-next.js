# Repeatable content contract

This contract covers independently reusable content with its own editorial
lifecycle: `Service`, `SkillGroup`, `Skill`, `TimelineEntry`, `Credential`,
`FAQ`, `Testimonial`, and `LegalDocument`. It deliberately does not create CRUD
collections for low-volume process steps, metrics, navigation, or social links.
Those values remain typed Site/Page content; Site policy requires a derived or
verified state before an enabled metric can be published.

No production record or personal claim is created by the foundation migration.
FAQ is independent because the fixed Page contract can reuse and query the same
answer across Home, About, and Contact without copying its body.

## Shared lifecycle and identity

Every record has contract version `1`, locale `en`, a collision-safe canonical
slug, canonical pillar keys, deterministic `sequence`,
`draft | published | archived` status, `published_at`, `first_published_at`,
`enabled`, `is_featured`, optimistic `version`, creator/updater IDs, timestamps,
and soft-delete fields. Slugs may be edited before first publication and are
locked afterwards. A soft-deleted slug may be reused; restoring the old record
then fails with `409 RESTORE_CONFLICT` instead of changing either slug.

All edit, lifecycle, reorder, restore, and delete operations include
`expected_version`. The repository updates `{ _id, version }` atomically and
returns `409 VERSION_CONFLICT` with the current version when known. Small records
do not receive a revision/snapshot subsystem; only Site and Page use draft and
published snapshots.

Creation/update, managed File reference reconciliation, the append-only audit
event, and a durable cache-invalidation intent commit in one MongoDB transaction.
Framework tag invalidation occurs after commit. Failure cannot roll back valid
content; the pending intent remains retryable. Permanent deletion is allowed
only after soft deletion and detaches managed File references in the transaction.

## Domain rules

| Domain        | Publish requirements                                                                   | Public trust behavior                                                        |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- | -------------------- |
| Service       | summary, outcome, primary pillar, capabilities                                         | only published, enabled records                                              |
| SkillGroup    | summary, description, primary pillar                                                   | only published, enabled records                                              |
| Skill         | published matching SkillGroup, pillar, proficiency and bounded evidence                | only derived/verified claims; group must remain public and pillar-compatible |
| TimelineEntry | explicit `experience                                                                   | education`, organization, position, dates and evidence                       | only derived/verified claims             |
| Credential    | explicit `certification                                                                | course                                                                       | award`, issuer/date, source and reviewer | only verified claims |
| FAQ           | question/title, answer and category                                                    | reusable public answer DTO                                                   |
| Testimonial   | source, relationship, reviewer, verified claim, explicit granted `public_site` consent | proof/source reference/consent internals and reviewer IDs are redacted       |
| LegalDocument | explicit type, semantic document version, effective date, typed sections and review    | only reviewed versions; unique active type/version                           |

Public projections are explicit allowlists. They never include actor IDs,
optimistic versions, deletion state, internal evidence references, private proof
Files, consent operations, provider metadata, or provenance. Public managed media
is populated only when active, ready, public, undeleted, and compatible with the
field purpose. Missing optional media is omitted so the rendering layer can use
its deterministic fallback.

## Routes and authorization

For each plural route (`services`, `skill-groups`, `skills`, `timeline`,
`credentials`, `faqs`, `testimonials`, `legal-documents`):

- `GET /api/{resource}` and `GET /api/{resource}/{slug}` return published DTOs.
- `GET|POST /api/{resource}/admin` lists or creates admin records.
- `GET|PATCH|DELETE /api/{resource}/{id}/admin` reads, edits, or soft-deletes.
- `POST .../restore` restores; `DELETE .../permanent` permanently deletes.
- `PATCH /api/{resource}/admin/reorder` applies up to 100 conditional moves.
- `PATCH /api/{resource}/admin/bulk` applies up to 100 lifecycle/feature actions
  and reports per-item success/failure.

Admin reads require `content:read`; ordinary mutations require `content:edit`;
publication also requires `content:publish`; permanent deletion requires
`content:permanent-delete`. Admin responses are private/no-store. Cookie-backed
mutations require an allowed same-origin request, JSON content type, and an
actually streamed body no larger than 256 KiB.

## Query and index budget

List queries accept only declared filter and sort keys. Pagination is limited to
50 records, page 200, and a maximum skip of 10,000. Search accepts at most eight
normalized terms/80 characters and strips Mongo text operators. Public callers
cannot request draft/deletion filters or arbitrary projections.
Canonical slugs and enums are normalized ASCII keys and use MongoDB's simple
binary collation; text indexes explicitly use `default_language: "none"` so
deployment locale cannot silently change stemming or index semantics.

Every collection has active locale/slug uniqueness, public sequence, public
pillar sequence, admin-updated, and bounded text-search indexes; domain indexes
cover group, type, date, category, consent/trust, and legal version shapes. The
text index reads a generated, capped `search_text` field built only from each
domain's declared `search_fields`; conditional edits regenerate it atomically.
Provider metadata, private evidence, consent internals, and actor IDs are never
indexed. The
repository exposes `explainPrimaryQueryShapes()`. Feed its `executionStats` into
`assessRepeatableExplainPlan()` during an integration/release check: populated
primary queries fail on `COLLSCAN` or on an examined/returned ratio over 50.
Empty collections are accepted.

Migration `202607150012-repeatable-content-foundation` is index-only. Its dry run
rejects incompatible legacy documents, duplicate active slugs, duplicate cache
intents, or same-name indexes with weaker options. It never guesses claims,
consent, evidence, dates, people, organizations, or copy.
