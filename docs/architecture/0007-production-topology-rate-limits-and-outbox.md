# ADR 0007: Production topology, rate limits, idempotency, and outbox

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Product owner and repository maintainer
- **Supersedes:** Any per-process production abuse limiter or request-coupled email delivery

## Context

Vercel Functions scale across isolated instances, so process memory cannot enforce a global limit. Contact intake also must not lose a valid inquiry because SMTP fails or a browser retries. Database, compute, and coordination latency must be intentional.

## Decision

### Initial production topology

Deploy one Next.js application on Vercel's Node.js runtime, not Edge, with global static/CDN delivery and one write region. Pin Node `24.x` in the repository and Vercel settings. The initial target is `sin1` (Singapore), with MongoDB Atlas and managed Redis provisioned in Singapore/the closest provider region before production. Cloudinary or GCP remains the media adapter/CDN. If the durable stores cannot be colocated, deployment pauses for a latency/topology amendment rather than silently using Vercel's default region.

Use one application write region in v1 to keep Mongo transactions, session rotation, audit ordering, and outbox leasing predictable. Preview deployments use isolated database/Redis namespaces and cannot send production email or access production media credentials. Local development may use an explicitly labeled in-process limiter, but startup must reject that adapter when `NODE_ENV=production`.

### Distributed abuse control

Use server-only `@upstash/redis` and `@upstash/ratelimit` adapters against a TLS managed Redis instance. These are approved infrastructure/security dependencies under ADR 0002. One central policy module creates namespaced, environment-specific HMAC keys; raw email, user ID, session ID, or IP is not stored in Redis/logs.

Initial limits are conservative defaults and remain environment-configurable within code-owned safe bounds:

| Surface                    | Primary windows                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Sign-in                    | 5 attempts/10 minutes per IP+normalized-account hash and 30/hour per IP hash             |
| Refresh                    | 20/minute per session-family hash and 60/10 minutes per IP hash                          |
| Contact                    | 3/10 minutes and 10/day per IP hash; idempotent replay does not consume a second success |
| Public review              | 5/hour per IP hash and one active submission fingerprint                                 |
| Upload                     | 20/10 minutes per user plus two concurrent uploads and purpose byte/count limits         |
| Authenticated admin writes | 120/5 minutes per session, with stricter publish/delete/role limits                      |

Return `429` with a bounded `Retry-After`; do not reveal which dimension fired. Sign-in, refresh, contact, review, and upload fail closed with a correlated `503 ABUSE_CONTROL_UNAVAILABLE` when Redis is unavailable. Existing public reads and an already-authorized admin read remain available. Admin mutation exceptions require a separate break-glass procedure, never an automatic fail-open path.

The adapter must inspect the SDK result and treat its timeout/fail-open reason as unavailable for these protected writes; a library timeout must not silently authorize a request. Analytics receives only HMAC identifiers and remains disabled until its retention/privacy configuration is approved.

Client IP resolution trusts only the documented Vercel ingress header chain in production. Direct/self-hosted deployment must configure an explicit trusted-proxy list first. A user-supplied forwarded header is never trusted by default. IP HMAC secrets rotate with a short overlap; analytics does not receive the raw address.

### Durable contact idempotency

The browser sends a UUID `Idempotency-Key`. The service validates it, computes a canonical request fingerprint, and stores only a keyed hash in a `ContactSubmissionKey` record with a unique `(scope, key_hash)` index, response Contact ID, status, and 24-hour TTL metadata.

In one Mongo transaction, the first accepted request creates Contact, submission key, AuditEvent, and OutboxEvent. A repeat with the same key and fingerprint returns the original safe result; the same key with a different fingerprint returns `409 IDEMPOTENCY_CONFLICT`. Redis is not the durability authority. Server-side duplicate heuristics may flag likely spam but never manufacture a success.

### Transactional outbox

Contact success means the inquiry is durably stored, not that email has already arrived. The outbox stores event type, aggregate ID, template/version, attempts, next-attempt time, lease owner/expiry, and status; it references Contact rather than copying the message body. A protected Vercel Cron Route Handler (or a later worker using the same lease API) atomically claims batches, sends with a provider idempotency key, and records delivery.

Delivery is at-least-once with provider deduplication where available, exponential backoff plus jitter, bounded attempts, stale-lease recovery, and a dead-letter/manual retry state. Logs include event/request IDs and provider status only, never contact message content. Request-lifecycle background work may reduce latency but is not the sole delivery path.

## Operational assumptions

- Environment secrets live only in encrypted deployment configuration and use separate preview/production values.
- Mongo connection pooling is cached per warm Node instance and sized for serverless concurrency.
- Availability/error objectives are evaluated over a rolling 30-day window; synthetic checks and valid-request telemetry distinguish application errors, deliberate `4xx`, cold starts, and provider outages.
- Region, plan limits, Redis/Mongo backup, and cron frequency are verified in the launch runbook.

## Consequences and constraints

- Redis adds infrastructure but not inquiry durability.
- A Redis outage blocks high-risk writes instead of weakening protection.
- Single-region writes trade regional failover for simpler correctness; CDN/cached public content still serves globally.
- Moving region or enabling multi-region writes requires a superseding topology/data-consistency ADR.

## Verification

- Concurrent multi-process tests prove limits are shared and keys contain no raw identifiers.
- Contact tests cover same/different fingerprint replays, transaction aborts, Redis failure, SMTP failure, worker crash, lease expiry, retries, and duplicate delivery.
- Deployment smoke tests measure compute-to-Mongo/Redis latency and prove preview/production isolation.

## Rollback implication

The application may disable contact/review/upload temporarily with an honest maintenance response, but must not fall back to unbounded writes or synchronous-only email. A provider change implements the same limiter/outbox interfaces and migrates live leases/keys or waits for their bounded expiry.

## References

- [Vercel Functions runtimes and regional behavior](https://vercel.com/docs/functions/runtimes)
- [Vercel regions and data colocation guidance](https://vercel.com/docs/regions)
- [Vercel supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Upstash rate-limit algorithms and regional trade-offs](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms)
- [Upstash timeout/fail-open behavior](https://upstash.com/docs/redis/sdks/ratelimit-ts/features#timeout)
