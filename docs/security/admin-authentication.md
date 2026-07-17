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

A publicly reachable production admin requires TOTP plus tested recovery.
TOTP is a shared-secret factor and is susceptible to real-time phishing; it is
not phishing-resistant. The server issues no access or refresh session until a
valid second factor is completed, rejects TOTP counter replay, and consumes each
recovery code once.

`AUTH_ADMIN_MFA_MODE` accepts only `required` or `disabled`. Missing or invalid
production values fail closed to `required`; `.env.example` sets that value
explicitly. `disabled` is allowed for local development. In production it is
permitted only while the admin is unreachable from the public internet and is
behind a separately reviewed identity-aware boundary.

On first password-authenticated privileged sign-in, register the displayed
manual secret in an authenticator, enter the current six-digit code, then store
the ten displayed recovery codes in an offline password vault. They are shown
once. A later sign-in accepts either a current TOTP or one unused recovery code.
Password changes and resets invalidate pending MFA challenges and all sessions.
Role, status, deletion, password timestamp, and MFA-version changes also make a
previously issued challenge unusable.

### Recovery and break-glass

Use an unused recovery code when the authenticator is unavailable. If both the
authenticator and recovery codes are lost, do not delete MFA records, change
`AUTH_MFA_ENCRYPTION_KEY`, or disable production MFA ad hoc.

For a genuine operator lockout:

1. Run from a restricted operator environment with an independently
   authenticated database connection, preserve a database backup, and record
   the incident/change ticket.
2. Keep `AUTH_ADMIN_MFA_MODE=required`. Run the target-specific command (replace
   the email in both arguments):

   ```sh
   pnpm auth:reset-admin-mfa -- \
     --email=admin@example.com \
     --confirm=RESET_MFA_FOR:admin@example.com
   ```

3. The command refuses non-admin, blocked, deleted, unknown, or unenrolled
   accounts. In one Mongo transaction it deletes only the named credential,
   invalidates pending challenges, increments the account MFA version, revokes
   every session, and appends `auth.mfa.reset` audit evidence. Any failed step
   rolls the transaction back.
4. The named admin signs in with the existing password, enrolls a new TOTP
   secret, and stores the new show-once recovery codes offline. Verify a later
   normal sign-in and review the reset/enrollment audit events before closing
   the incident.

## Abuse control

Sign-in uses HMAC identifiers: five attempts per IP/account pair per ten
minutes, ten per account per hour, and 30 per IP per hour. MFA verification is
bounded per challenge, per IP, and—after the opaque challenge is resolved
server-side—per user across renewed challenges and changing IPs. Refresh uses
20 per family per minute and 60 per IP per ten minutes. Recovery is also
bounded. Production uses the configured Upstash REST store and fails closed on
missing credentials, untrusted client IP, timeout, or malformed provider
response. Raw email, user ID, IP, token, and session identifiers are never
Redis keys.
