# Contact inbox, privacy, and retention operations

## Administrative boundary

- `GET /api/contacts/admin` returns a bounded, allowlisted inbox DTO. It never returns the message, raw idempotency hashes, receipts, outbox locks, provider payloads, or secrets. Email addresses are masked.
- `GET /api/contacts/:id/admin` is the separately authorized detail read and is the only inbox DTO containing the full email and message.
- All admin responses are private `no-store`. Browser mutations require the configured same origin in addition to an authenticated session.
- Admins with `inbox:manage` can read, transition, soft-delete, restore, export, and retry eligible delivery. Retention holds and irreversible anonymization/permanent deletion are super-admin-only capabilities.

## State and delivery policy

Status changes require `expected_revision`; stale requests fail with `409`. The transition graph is code-owned in `contact-inbox.policy.ts`. Repeating the current state is idempotent. Moving a record to `spam` or `archived` cancels any unfinished notification and never silently re-sends it later.

Manual retry is allowed only for a non-anonymized, non-expired record outside `spam`/`archived`, with a `dead_letter` or `cancelled` outbox event and a matching revision. It resets bounded delivery scheduling state but never exposes lock tokens or provider errors beyond the fixed safe error code.

Every administrative transition, retry, export, deletion, restoration, hold change, anonymization, and purge appends a redacted AuditEvent. Audit metadata cannot contain the email or message.

## Data-subject access and deletion

`POST /api/contacts/privacy` accepts an email and `access` or `delete`. It always returns the same accepted shape and sends the same six-digit verification flow, whether or not matching data exists; a verified no-match access therefore returns an authoritative empty export. Only HMACs of the email and code are persisted. Codes expire after 15 minutes, allow at most five attempts, are rate-limited by hashed subject and trusted client IP, and are never put in a URL.

`POST /api/contacts/privacy/confirm` claims a request once. A verified access request returns only the subject's stored contact records as a `no-store` JSON attachment. A verified deletion request anonymizes matching records. Active legal holds are reported after verification and defer deletion until the hold expires. Requests larger than the bounded export budget require assisted handling rather than returning a partial export.

## Retention and purge

The authenticated retention job first anonymizes expired records not protected by an active hold. Anonymization replaces all contact PII/content, cancels pending delivery, removes idempotency records, increments the revision, and sets `purge_after` 30 days later. The non-PII tombstone supports retry-safe operations and audit correlation. A later job permanently removes due tombstones and their operational outbox data; append-only AuditEvents remain under their independent fixed retention policy.

Holds use a fixed reason-code enum, require an expiry between one hour and one year, and are fully audited. Free-text evidence is intentionally not stored in the Contact record.

Run migration `202607150011-contact-inbox-operations` before enabling these endpoints in production.
