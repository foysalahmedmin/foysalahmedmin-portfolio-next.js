# Site foundation migration

Migration `202607150010-site-foundation` is expand-only and creates five verified
indexes:

- unique `sites.site_key` singleton identity;
- bounded published timestamp lookup;
- unique `(site, revision)` cache-invalidation intent identity;
- pending invalidation delivery lookup.
- seven-day TTL cleanup for delivered invalidation intents; pending work never
  expires.

The migration deliberately does not create a Site record or invent portfolio
identity. If legacy Site documents have a non-canonical singleton/schema shape,
multiple `primary` records, malformed publication metadata, or duplicate cache
intents, dry-run reports the counts and apply stops with
`SITE_FOUNDATION_REMEDIATION_REQUIRED`.

## Deployment sequence

1. Run `pnpm db:migrate:dry-run` against the explicit target database.
2. Remediate any reported legacy Site conflicts through an approved, audited
   data decision; do not copy draft values into public state automatically.
3. Run `pnpm db:migrate` before enabling Site admin mutations.
4. Verify all five indexes and create the singleton through the protected admin
   endpoint.
5. Complete and publish the canonical six-pillar snapshot. Until then, public
   readers render only the neutral code-owned emergency contract.

Rollback may stop using the new domain while leaving its collections and indexes
in place. Do not drop the unique singleton or invalidation-intent indexes while
writers are active.
