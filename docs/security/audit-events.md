# Administrative audit events

`AuditEvent` is a redacted accountability record for consequential administrative and security actions. It is not an application log, analytics stream, or a shadow copy of domain records.

## Write contract

New integrations call `appendAuditEvent` and, where an audited mutation is critical, pass the same Mongo `ClientSession` used by that mutation. The helper requires an enumerated action, actor snapshot, compatible target, outcome/source, and a machine-readable `summary_code`. User actors require an ObjectId and role snapshot. Session and correlation identifiers are stored only as purpose-separated HMAC-SHA-256 values using `AUDIT_HMAC_SECRET`.

The service accepts only these metadata keys: HTTP method, request channel, content type, previous/next state, previous/next role, storage provider, security signal, migration ID, result count, batch size, and transactional flag. Values are type/length bounded. Unknown keys are dropped and sensitive-looking allowed values become `redacted`. Changed-field paths are deduplicated and bounded; paths containing password, token, secret, email, message, body, content, evidence, cookie, authorization, or API-key segments become `[redacted]`.

Never pass request bodies, before/after objects, contact content, email addresses, rich text, credentials, tokens, provider responses, stack traces, or arbitrary user-provided summaries.

The legacy contact intake shapes (`entity_type`, `entity_id`, `actor_type`, and `correlation_hash`) remain accepted and are normalized to the canonical target fields. The only application deletion exception is the explicit contact rollback-compensation helper, used when a non-transactional fallback failed before the logical submission committed.

## Append-only and retention behavior

All persisted fields are immutable. Model middleware rejects document saves after insertion and rejects update, replacement, and deletion queries. MongoDB administrators can still bypass application middleware, so production database permissions and change monitoring remain part of the boundary. TTL expiry bypasses Mongoose and removes events at `retain_until`, currently 365 days after creation. Extending retention or implementing legal hold requires a reviewed policy and migration; callers cannot choose retention dates.

Migration `202607150005-audit-event-foundation` backfills legacy contact events, removes all pre-foundation metadata from records it normalizes, assigns deterministic event UUIDs, and creates unique identity, bounded timeline, target/actor, and TTL indexes. Because it can discard legacy metadata, it is declared destructive and requires the migration runner's verified-backup gate plus quiesced audit writes. Apply it before deploying new audit writers.

## Read contract

`GET /api/audit-events` is authenticated and performs an explicit `audit:read` capability check. Only super-admin/admin currently have that capability. The endpoint has a fixed response projection: it never returns Mongo IDs, legacy entity fields, session hashes, or arbitrary projections.

Queries support only page, limit, from/to, action, actor type/ID, target type/ID, outcome, source, and a raw correlation ID that is HMACed before lookup. The default range is 30 days, the maximum range is 90 days, the maximum page size is 100, and the maximum page is 10,000. Responses are `private, no-store` and vary on cookies/authorization.

## Operational checklist

- Configure a distinct random `AUDIT_HMAC_SECRET` of at least 32 characters in every environment.
- Run migration dry-run, review aggregate counts, verify a restorable backup, quiesce conflicting writes, then apply migration `0005` before relying on the new query endpoint.
- Use a replica set for audited domain mutations that must commit atomically with their audit event.
- Alert on `Audit events are append-only` errors; they indicate an application path attempted to mutate history.
- Keep high-volume reads, health checks, and operational provider retries in structured logs rather than AuditEvent.
