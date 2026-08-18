# Contact intake security and privacy

## Trust boundary

`POST /api/contacts` is an unauthenticated, same-origin JSON endpoint. It does
not use cookie authority, so a synchronizer CSRF token adds no security value.
Instead, the route requires an exact configured `Origin`, rejects cross-site
Fetch Metadata, accepts only JSON, and caps the raw request body before parsing.
Do not add credentialed cross-origin access to this route without revisiting the
CSRF design.

The browser sends a per-attempt idempotency key and a per-tab session key. The
server stores only HMAC hashes of those values and the proxy-derived IP abuse
key. It never returns a Contact ObjectId, message body, email address, or other
PII. Reusing an idempotency key with the same normalized payload returns the
same public receipt; reusing it for different content is rejected.

Configure `CONTACT_CLIENT_IP_HEADER` only to a header that the deployment edge
overwrites. For `x-forwarded-for`, `CONTACT_TRUSTED_PROXY_HOPS=0` selects the
right-most address, `1` skips one trusted proxy, and so on. Validate this choice
against the real production header chain before launch.

## Rate limiting and database consistency

Upstash Redis REST is the shared authority for both HMAC-hashed IP and
browser-session buckets whenever its credentials are configured. When they are
absent, or when the provider errors or times out, limiting degrades to the
in-process store instead of failing closed, so contact intake stays available.
Multi-instance deployments must configure Upstash: without it each instance
counts its own buckets, so the effective limit multiplies by instance count.

Contact, ContactSubmissionKey, AuditEvent, and OutboxEvent are written in one
MongoDB transaction. Production defaults to requiring replica-set transaction
support. `CONTACT_REQUIRE_TRANSACTIONS=false` explicitly enables a tested
compensation path for a topology that cannot transact, with a weaker atomicity
guarantee. A provider notification failure never deletes the stored inquiry.

## Delivery operations

A trusted scheduler calls `GET` or `POST /api/internal/contact-outbox` with
`Authorization: Bearer <CONTACT_WORKER_SECRET>`. Run it at least once per minute.
The worker atomically leases due events, sends an escaped/validated email,
retries with bounded exponential backoff, and dead-letters after the configured
attempt count. Outbox payloads contain only the Contact reference; PII is loaded
just in time and is never copied into operational events or logs.

Monitor aggregate delivered, retrying, dead-letter, cancelled, and 503 counts.
Do not log request bodies, generated email bodies, raw IP addresses, email
addresses, idempotency keys, SMTP errors, or authorization headers.

## Retention, access, and deletion

The default contact PII retention window is 365 days (configurable from 30 to
730). A trusted daily scheduler calls `/api/internal/contact-retention`. Expired
records are anonymized in place, pending delivery is cancelled, and their
idempotency keys are removed. Permanent admin deletion also removes submission
keys and outbox records; minimal non-PII audit history may remain.

The P08 workflow now implements the following controls; its complete route,
transition, hold, subject-rights, tombstone, and purge policy is documented in
[`contact-inbox-privacy.md`](./contact-inbox-privacy.md):

- identity-verified access/export using a one-time secure delivery channel;
- idempotent deletion/anonymization by Contact ID and verified requester email;
- legal-hold overrides with an auditable reason and expiry;
- admin DTO redaction and least-privilege access to message content;
- dead-letter recovery and bounded retention operational visibility.

Production operations must still connect scheduler failures and dead-letter
state to the deployment's alerting/incident system.

Never place contact PII in analytics, error telemetry, fixtures, Git history, or
audit metadata.
