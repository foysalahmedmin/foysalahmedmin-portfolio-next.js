# Database migrations

Migrations run only through an explicit release command. They never run during
application startup, `next build`, or a serverless request.

## Safe release flow

1. Stop application writes for the release window.
2. Create and verify a restorable MongoDB backup.
3. Set `DATABASE_URL` to an explicit database, set `MIGRATION_RELEASE`, and run
   `pnpm db:migrate:dry-run`.
4. Resolve every reported active-key collision. The report contains aggregate
   counts only; it does not expose category names, email addresses, or document
   IDs.
5. Set a restore-point identifier in `MIGRATION_BACKUP_REFERENCE` and its fresh
   canonical UTC timestamp in `MIGRATION_BACKUP_VERIFIED_AT` (for example,
   `2026-07-15T08:30:00.000Z`). The apply gate accepts confirmations for 24 hours.
6. Run `pnpm db:migrate`. Re-run the dry-run afterwards and retain the release
   output with the deployment evidence.

The runner records ordered source checksums in `schema_migrations`. Missing,
reordered, or edited migration sources stop all work. Apply runs share an
expiring, heartbeated MongoDB lease; failed or interrupted records retain a
checkpoint and can be safely retried because every migration re-inspects state.
Dry-run is read-only and does not acquire a lease or write migration metadata.

## Equivalent-index fallback

The partial-index migration first creates and verifies every replacement before
dropping any legacy full unique index. On MongoDB versions that reject equivalent
key patterns, it fails without dropping the legacy index.

Only after a reviewed dry-run, a verified backup, and confirmed write shutdown,
an operator may set `MIGRATION_WRITES_QUIESCED=true` and append
`--allow-index-replacement-gap` to the apply command. That path captures the
legacy specification, drops it, creates and verifies the replacement, and tries
to restore the captured legacy index if creation fails. Index DDL is not
transactional: if both replacement and restoration fail, keep writes disabled
and restore the referenced backup. There is intentionally no generic `down`
command.

## Rich-content sanitization

`202607150002-sanitize-rich-content` removes unsafe legacy article/project
markup and writes the versioned rich-content envelope. Sanitization
intentionally discards rejected markup, so apply requires a fresh verified
backup confirmation. Dry-run and apply summaries contain aggregate counts only,
never submitted content.

## Contact intake foundation

`202607150004-contact-intake-foundation` backfills legacy contact status,
delivery, anonymization, and fixed 365-day retention timestamps. It then creates
the ContactSubmissionKey, AuditEvent, and OutboxEvent indexes required for safe
idempotency and worker leasing. The dry-run reports counts only. Any duplicate
idempotency hashes or public receipts stop apply before unique index creation;
the migration never prints the colliding values.

## Auth session foundation

`202607150008-auth-session-foundation` creates the unique session identifier,
family/user lookup, expiry, one-time recovery-token, and recovery expiry indexes
required before stateful refresh sessions are enabled in production.

## File metadata and provenance

`202607150009-file-metadata-provenance` performs evidence-backed provider,
dimension, and source backfills, then records queryable media-health gaps
without inventing accessibility copy, crop decisions, generation details, or
rights claims. See the
[File metadata and provenance rollout](./file-metadata-provenance.md) for the
expand/deploy/contract boundary.

## Site foundation

`202607150010-site-foundation` creates the unique Site singleton and durable
published-cache invalidation indexes. It creates no identity content and blocks
on ambiguous or malformed legacy Site records. See the
[Site foundation rollout](./site-foundation.md).

## Repeatable content foundation

`202607150012-repeatable-content-foundation` creates the explicit lifecycle,
public/admin query, trust, ordering, search, legal-version, and durable cache
indexes for the eight repeatable domains. It is index-only and fails closed on
incompatible legacy records, active slug collisions, duplicate cache intents,
or weaker same-name index definitions. It never creates or infers portfolio
content, identity, evidence, consent, or professional claims. See the
[repeatable content contract](../data/repeatable-content.md).
