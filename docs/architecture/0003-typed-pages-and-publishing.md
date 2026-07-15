# ADR 0003: Fixed routes, typed Page sections, and publishing

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Product owner and repository maintainer
- **Supersedes:** None

## Context

The site needs editable composition without becoming an unrestricted page builder. Site-wide identity must publish atomically, while independently queried records need simpler editorial lifecycles and safe concurrent editing.

## Decision

### Fixed routes and typed composition

`PageKey` is the allowlist `home | about | projects | articles | contact | privacy | terms`. Version 1 supports locale `en`; the schema keeps locale explicit and enforces a unique `(page_key, locale)` pair. Code maps every key to a fixed implemented route. Admin users cannot create paths, component names, redirects, scripts, or arbitrary templates.

Each Page snapshot contains an ordered array of section subdocuments validated by one versioned Zod discriminated union. Every section has `section_key`, `type`, `enabled`, `sequence`, an allowlisted `variant`, and type-specific configuration. The compile-time section registry maps each `type` to its schema and renderer. Rendering uses an exhaustive switch; unknown types fail publish and are never dynamically imported by stored path.

Section configuration stores references and presentation policy—curated IDs or query mode, limits, layout variant, heading overrides, and visibility—not copies of project/article/service bodies. Rich text follows ADR 0004. Referential validation confirms published/eligible targets and File readiness before publish.

### Snapshot domains

`Site` and `Page` documents each hold:

- mutable `draft` content with `revision`;
- immutable-by-convention `published` content with its own revision, timestamp, and publisher;
- `schema_version`, timestamps, and soft-delete/identity fields outside the snapshots.

Draft PATCH requires `expected_revision` (and supports an equivalent strong ETag/`If-Match` adapter). The repository performs one conditional atomic update and increments the revision; a stale editor receives `409 VERSION_CONFLICT` plus current revision metadata, never last-write-wins.

Publish validates the complete snapshot/reference graph, then in one Mongo transaction conditionally copies draft to published, records the publisher/revision, and appends the audit event. Only after commit does the service invalidate bounded cache tags. Cache invalidation failure is logged/retried and does not undo a valid publication. Public reads continue serving the prior published snapshot until commit.

Preview reads the saved draft through a short-lived, scope-bound, httpOnly preview session. Preview and all admin reads are `no-store` and `noindex`; a token is never placed in a URL.

### Record domains

Projects, articles, services, skills, timeline entries, credentials, FAQs, testimonials, and legal records use explicit `draft | published | archived` status (plus domain moderation/verification where needed), `published_at`, and an optimistic integer `version`. Updates and status transitions require the expected version and append AuditEvent history. They do not each duplicate the Site/Page snapshot mechanism.

Testimonials additionally require verified consent before publication. Demo/unverified records are structurally prevented from being published in production.

## Consequences and constraints

- New layouts require deployed code and a registry/schema version before editors can select them.
- Atomic snapshots make public identity/layout internally consistent at the cost of copying a bounded document.
- Site/Page snapshots must stay below a documented size budget; large repeatable content and media remain referenced records.
- Deleting or archiving referenced content must either block, remove the reference in a new revision, or preserve the last published projection according to domain policy.

## Verification

- Schema/renderer parity tests enumerate every section type and reject unknown types/variants/fields.
- Concurrency tests prove stale draft edits and stale publishes return `409` without overwriting work.
- Transaction tests prove audit/published snapshot atomicity and post-commit-only invalidation.
- Preview tests prove route/user/scope/expiry isolation and absence from public caches and metadata.

## Rollback implication

Rollback selects an earlier valid published snapshot as a new publication and audit event; history is not mutated. Removing a section type requires a migration and a compatibility renderer until no stored draft or published snapshot references it.
