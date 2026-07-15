# ADR 0008: Migrations and audit events

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Repository maintainer
- **Supersedes:** Ad hoc startup-time schema mutation

## Context

The transformation changes slugs, visibility, rich content, snapshots, File references, and session data. These changes need replayable production evolution and a redacted history of consequential actions.

## Decision

### Migration registry

Migration files use an immutable UTC identifier and kebab-case name: `YYYYMMDDHHmm-description.ts`. Each exports the same typed contract: `id`, `description`, `up(context)`, optional `dry_run(context)`, and declared transaction/index behavior. The runner computes a SHA-256 checksum of the migration source and records it in `schema_migrations` with status, start/finish time, release, duration, and redacted summary.

Applied files are never edited, reordered, reused, or deleted. A checksum mismatch or duplicate/out-of-order ID stops the run. A Mongo lease with owner, heartbeat, and expiry permits one runner per environment. Migrations never execute on module import, application startup, `next build`, or every serverless instance; an explicit release command/job runs them before compatible code is promoted.

`up` is retry-safe/idempotent at record level. Small document changes use transactions where supported. Long backfills are bounded, checkpointed, resumable batches; index builds and provider operations declare their non-transactional phase. Destructive work requires a verified backup/restore point, dry-run counts/samples, and expand → backfill → validate → switch readers → contract sequencing. Production has no generic automatic `down`; rollback uses compatible readers and a reviewed compensating migration.

Seeds are separate from migrations. They use stable seed keys/hashes and cannot mark demo/unverified content publishable in production.

### AuditEvent domain

`AuditEvent` is append-only and written through one service. It contains:

- immutable event UUID, schema version, action enum, UTC timestamp, and correlation/request ID;
- actor type (`user | system | migration`), safe actor ID/role snapshot, and session ID hash when applicable;
- target type and ID, resulting optimistic/published revision, and outcome;
- a small allowlisted metadata object and redacted changed-field paths;
- optional reason and source (`admin | api | migration | job`).

It never stores access/refresh/preview tokens, secrets, password material, raw IP/email, contact messages, rich-content bodies, evidence documents, upload bytes, or unrestricted before/after objects. An IP HMAC/user-agent class may be recorded only for defined security events under the privacy/retention policy.

Publish, sensitive Site settings, role/status/session changes, authentication security events, File permanent deletion, content delete/restore, and migration execution are audit-critical. Their mutation and AuditEvent append share a Mongo transaction and fail together. Non-critical read/health telemetry belongs in structured logs, not AuditEvent. Cache invalidation and external provider delivery happen after commit and report their own correlated operational event.

Only `audit:read` can query audit data. Queries are bounded and filterable by time/action/target/actor; there is no public endpoint or arbitrary field projection. Production retains online audit events for 12 months, then follows an approved archive/deletion policy; a legal/security requirement may extend this through a new policy decision.

## Consequences and constraints

- Releases gain an explicit data step and rollback discipline.
- Append-only redacted events support accountability without becoming a shadow copy of sensitive content.
- Migration code must support mixed old/new schema during expand/contract windows.
- Permanent erasure workflows remove/anonymize subject data without mutating the factual event action; actor/target identifiers are pseudonymized when required.

## Verification

- Runner tests cover lock contention/expiry, retry after crash, checksum mismatch, partial batch resume, transaction abort, dry-run non-mutation, and backup gate.
- Audit tests assert critical mutations cannot commit without an event and forbidden paths/values are always redacted.
- Release rehearsal runs migrations twice against a production-shaped fixture and produces the same final state.

## Rollback implication

Application rollback is permitted only while the earlier reader remains compatible with migrated data. Otherwise restore the verified backup or apply a compensating migration. Audit records are never deleted to hide a rollback; rollback itself is a new event.
