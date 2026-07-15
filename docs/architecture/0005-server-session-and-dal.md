# ADR 0005: Server session, capabilities, and data-access layer

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Repository maintainer
- **Supersedes:** Current client-only admin guarding and duplicated JWT checks

## Context

The application issues access/refresh JWT cookies and checks API roles, but the admin layout can render before a reliable server authorization boundary. Refresh tokens are stateless and the current cookie lifetime can exceed token intent. Redux/localStorage state cannot protect server-rendered routes or data.

## Decision

### One server authority

A `server-only` auth module owns cookie parsing, strict JWT verification, and session lookup. Its internal `verify_session()` returns a minimal session principal or `null`; `require_session()` and `require_capability()` provide page/API boundaries. A DAL close to each protected query calls these helpers before reading or mutating private data. Per-request React memoization may deduplicate verification, but session results are never placed in the Next Data Cache.

Both admin Server Components and Route Handler auth middleware call this same authority. The `/admin` server layout requires an allowed capability before rendering. API/service authorization remains mandatory independently; an optional `proxy.ts` coarse redirect is defense in depth, never the security boundary.

### Stateful refresh sessions

Keep short-lived signed access JWTs, but add a database `Session` record and a random `sid` claim. The record contains user ID, refresh-token-family ID, a one-way refresh-token hash, expiry, last-use time, rotation counter, and revocation metadata. It contains no raw token. Verification allowlists algorithm, issuer, and audience and then confirms session/user existence, expiry, status, deletion state, password/security version, and current role.

Access lifetime remains 15 minutes; refresh lifetime is seven days unless a later security ADR changes both environment and cookie policy. Refresh rotates the token and stored hash every use. Reuse of an older token revokes the family. Password, role, status, deletion, explicit logout, and administrator revocation invalidate applicable sessions. Generic auth errors do not disclose whether an account exists.

Access and refresh cookies are `httpOnly`, `SameSite=Lax`, `Secure` in production, host-only (no `Domain`), and `Path=/`; cookie `Max-Age` never exceeds token/session expiry. Cookie-authenticated unsafe methods also enforce trusted Origin plus Fetch Metadata/CSRF policy. Logout revokes server state and expires both cookies, even when one token is already invalid.

### Roles and capabilities

Tokens identify the session; they do not grant immutable authorization. A code-owned role-to-capability map produces explicit capabilities such as `site:read`, `site:edit`, `site:publish`, `content:edit`, `media:manage`, `inbox:manage`, `users:manage`, and `audit:read`. Sensitive services check a capability using the current database role/status. Public DTOs never expose this map or private principal fields.

The initial policy is least-privilege:

| Role                  | Admin capability boundary                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `super-admin`         | All capabilities, role/session administration, permanent deletion, and protected infrastructure settings.                                       |
| `admin`               | Site/content edit and publish, media, inbox, audit read, and ordinary user administration; cannot grant/manage `super-admin` or expose secrets. |
| `editor`              | Site/content drafts, content publish, and bounded media management; no Site publish, users, inbox, audit, or permanent deletion.                |
| `author`              | Create/edit/submit own articles and attach bounded media; no direct publish.                                                                    |
| `contributor`         | Create/edit/submit own assigned drafts only; no publish or global media library access.                                                         |
| `subscriber` / `user` | No admin-route capability. Public/account behavior only.                                                                                        |

Every privilege escalation and sensitive role change requires `super-admin`, target constraints, fresh-session confirmation, and an AuditEvent. UI visibility derives from returned capabilities but service checks remain authoritative.

Admin redirects use `/admin/signin?return_to=...`; `return_to` must be a normalized same-origin path under `/admin`, excluding sign-in, control characters, encoded protocol-relative paths, and external URLs. Admin, sign-in, and preview responses are `noindex` and `no-store`.

Preview authorization uses a separate short-lived, purpose/scope/user-bound httpOnly session. It cannot call admin mutations or be accepted as an ordinary login session.

## Consequences and constraints

- Protected navigation adds a small database lookup, acceptable for the admin surface; indexes cover session/user checks.
- A leaked refresh token is revocable and reuse-detectable.
- Redux may mirror the returned minimal principal for UI display only; it never decides access.
- Node.js runtime is required for current database/auth adapters. Edge middleware cannot import the DAL.

## Verification

- Tests cover missing/invalid/expired tokens, issuer/audience/algorithm mismatch, blocked/deleted users, password/role changes, capability denial, rotation, concurrent refresh, reuse detection, revocation, and logout.
- Direct navigation tests prove no private admin HTML/data renders before authorization.
- Open-redirect and CSRF/fetch-metadata matrices cover encoded and proxy-derived inputs.

## Rollback implication

Rollout accepts existing refresh tokens only through a short, explicit migration window that creates a Session on first valid refresh; after the window, legacy stateless refresh is disabled. Rolling back UI code must not re-enable client-only protection or stateless refresh. Emergency rollback revokes all sessions and requires sign-in again.

## Reference

- [Next.js authentication, DAL, DTO, and optimistic Proxy guidance](https://nextjs.org/docs/app/guides/authentication)
