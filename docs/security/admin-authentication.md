# Admin authentication and recovery runbook

The admin uses a 15-minute signed access token plus a seven-day stateful refresh
session. Both are host-only, `httpOnly`, `SameSite=Lax` cookies and are `Secure`
in production. Refresh tokens rotate on every use; only a SHA-256 token hash is
stored. Presenting an older token revokes the entire family. Logout, password,
role, status, deletion, and explicit administrator revocation invalidate server
state, so deleting browser state is never the authority.

## Roles and capabilities

`src/lib/auth/capabilities.ts` owns the role map and the complete current admin
mutation matrix. UI navigation consumes the returned safe capability list, but
the API middleware recomputes authorization from the current database role.
Unknown admin API resources fail closed. Authors/contributors receive an admin
shell and own-content capability names, but global edit endpoints remain denied
until their ownership constraints are implemented in the domain services.

## Password and recovery policy

New passwords contain at least 12 characters, one lowercase letter, one
uppercase letter, and one number, and never exceed bcrypt's 72 UTF-8-byte input
limit. Current-password change revokes every session. Recovery returns the same
accepted response for eligible and unknown accounts, stores only a hash of a
32-byte random one-time token, expires it after 15 minutes, atomically claims it,
and revokes all sessions after use. The reset UI must remove the token from the
address bar immediately and send `Referrer-Policy: no-referrer` before launch.

## Signup and initial bootstrap

Public signup is off unless `AUTH_PUBLIC_SIGNUP_ENABLED=true`; even then the
server creates only `user` and rejects unknown/elevated fields. There is no
HTTP super-admin bootstrap. On an empty, transaction-capable database, set the
four `BOOTSTRAP_SUPER_ADMIN_*` variables and run:

```sh
pnpm auth:bootstrap-super-admin
```

The command atomically creates one verified super-admin and a permanent marker.
It refuses a non-empty/already-bootstrapped database. Remove the password and
confirmation variables immediately after use.

## MFA launch gate

A publicly reachable production admin requires phishing-resistant MFA/TOTP plus
tested recovery. No enrollment/provider is currently integrated, so the default
`AUTH_ADMIN_MFA_MODE=required` deliberately blocks every privileged production
sign-in. This is a launch gate, not a bypass. `disabled` is permitted only when
the admin is private behind separately reviewed identity-aware access; changing
that deployment assumption requires a threat-model review and an ADR update.

## Abuse control

Sign-in uses HMAC identifiers: five attempts per IP/account pair per ten minutes
and 30 per IP per hour. Refresh uses 20 per family per minute and 60 per IP per
ten minutes. Recovery is also bounded. Production uses the configured Upstash
REST store and fails closed on missing credentials, untrusted client IP, timeout,
or malformed provider response. Raw email, IP, token, and session identifiers
are never Redis keys.
