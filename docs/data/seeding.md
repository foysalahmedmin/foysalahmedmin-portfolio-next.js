# Safe portfolio seeding

Seeds are reviewed content operations, not schema migrations. The seed runner
uses stable keys, immutable version checksums, record hashes, a lease, and one
MongoDB transaction. It never treats a provider upload as part of that
transaction and never creates an administrator.

## Prerequisites and command surface

Use the repository-declared Node.js and pnpm versions, apply the schema
migrations, then run the locked administrator bootstrap once if the database has
no users. The bootstrap refuses any database that already contains a user or its
permanent marker; the seed runner only selects an existing, verified, unblocked
super-admin as its audit actor and never reads, logs, generates, changes, or
downgrades that account's password or role.

```sh
pnpm auth:bootstrap-super-admin
pnpm db:migrate:dry-run
pnpm db:migrate
pnpm seed:dry-run
pnpm seed
```

If more than one eligible super-admin exists, set `SEED_ACTOR_EMAIL` to select
one. The address is used only for an exact database lookup and is not emitted in
the plan. `DATABASE_URL` must include an explicit non-system database name. Seed
writes require replica-set or mongos transaction support; there is no
non-transactional write fallback.

Additional commands are deliberately narrower:

- `pnpm seed:demo` applies the isolated demo manifest. It currently contains no
  fixtures; P09.3 must increment its version before adding synthetic records.
- `pnpm seed:reset` removes records still owned by the foundation manifest. It
  requires `SEED_RESET_CONFIRM=RESET_NON_PRODUCTION_SEED_DATA`.
- Append `-- --force` only for a reviewed non-production recovery. Force is
  permanently rejected in production.
- To reset the demo manifest, run `pnpm seed:reset -- --demo` with the same
  reset confirmation.

`seed:demo` and `seed:reset` are unconditionally disabled when
`NODE_ENV=production`; no bypass flag exists. A production foundation write also
requires
`SEED_PRODUCTION_CONFIRM=APPLY_TRUTHFUL_PORTFOLIO_FOUNDATION`. Production dry
run remains available without that phrase because it performs no writes. When
`SEED_ENVIRONMENT` is supplied it must exactly match `NODE_ENV`, preventing an
operator from labelling a production process as development.

## Idempotency and edit preservation

Every controlled target has a companion record in `seed_records` containing:

- `seed_key`, `seed_version`, and the target collection/ID;
- `last_seed_hash`, computed from canonical controlled fields only;
- the controlled top-level field list, truth marker, and application time.

`seed_manifests` stores the manifest version and checksum. Changing seed content
without incrementing the manifest version fails with `SEED_CHECKSUM_DRIFT`, and
a version downgrade always fails. Operational actor IDs and timestamps are not
part of the content checksum, so selecting another legitimate actor does not
pretend the content changed.

The dry-run plan reports `create`, `update`, `adopt`, `unchanged`, or `conflict`
per stable seed key and lists changed top-level fields without printing record
content. The apply policy is:

| Existing state                                                    | Result                                |
| ----------------------------------------------------------------- | ------------------------------------- |
| No target and no ownership record                                 | Create once                           |
| Identical target but ownership record missing after a partial run | Adopt safely                          |
| Target hash still equals `last_seed_hash` and seed changed        | Update                                |
| Target hash differs from `last_seed_hash`                         | Preserve and report conflict          |
| Managed target was deleted                                        | Preserve deletion and report conflict |
| Stored version is newer                                           | Reject downgrade                      |

A deliberate non-production `--force` may replace an unmanaged/edited target or
re-create a missing one. It cannot bypass version downgrade or target identity
conflicts. Reset applies the same hash check, runs in reverse dependency order,
and preserves edited records unless non-production force is explicit.

The runner executes records in this fixed order:

1. administrator preflight;
2. managed media;
3. Site;
4. categories;
5. repeatable content;
6. projects and resources;
7. articles;
8. Pages.

Target writes, ownership records, the manifest checksum, and the safe run record
commit in one transaction. Any validation, reference, uniqueness, or later-stage
failure rolls all database writes back.

## Managed-media boundary

Seed definitions cannot contain binary blobs or remote media URLs. A repository
asset request must have a safe path beneath an explicitly configured asset root
and the SHA-256 checksum of its source bytes. The trusted adapter in
`managed-media.seed-gateway.ts` passes the bytes through
`prepareManagedMedia` and `createManagedFiles`, so signature checks,
canonicalization, purpose policy, immutable storage keys, provider validation,
File lifecycle, and checksum deduplication are identical to normal managed
uploads. It never imports a Cloudinary/GCP SDK and never performs HTTP itself.

Provider work happens before the content transaction. An already-ready matching
File is reused. A File newly created by the run is tagged with a deterministic
idempotency identity; if a later provider stage or the database transaction
fails, only Files proven to have been created by that run are compensated in
reverse order. Reference validation runs inside the content transaction before
commit. Provider uploads are therefore never described as transactionally
rolled back.

The version-1 foundation has no repository media and does not require provider
credentials. It stores six validated `awaiting_source` intents—five non-human
pillar hero visuals and one social preview—with null source checksum and null
File ID. It never invents provider records, URLs, uploads, checksums, dimensions,
or successful ingestion. P12 must create the assets, record their real source
checksums/provenance, ingest through the managed-media adapter, attach valid File
IDs, increment the seed version, and re-run verification.

## Truthful foundation inventory

Version 1 creates only draft configuration supported by the committed content
truth manifest:

- one unpublished Site singleton;
- exactly five embedded pillar presentations in canonical order, each with its
  own code-owned fallback visual key and pending managed visual intent;
- neutral route navigation, hidden contact channels, unknown availability,
  indexing disabled, metrics/testimonials/availability features disabled, and
  no social or resume links;
- seven unpublished, `noindex` fixed Page compositions for Home, About,
  Projects, Articles, Contact, Privacy, and Terms;
- Privacy/Terms Page configuration that references a future reviewed legal
  document by type, without inventing policy text, jurisdiction, reviewer, or
  effective date.

All pillars remain disabled and the Site has no published snapshot. The
canonical labels are information architecture, not proof of personal expertise.
The Page layouts can render truthful empty/unavailable states while approved
records are absent.

The seed intentionally creates no services, skills, process claims, metrics,
timeline/employment, education, credentials, FAQs, legal-document bodies,
projects, articles, contacts, testimonials, external links, or resume. The truth
inventory marks those facts as unverified or unavailable. Numeric task targets
do not authorize fabricated production proof. Those collections remain empty
until an owner-reviewed source supplies the required structured facts,
verification state, consent, dates, and evidence references.

## Verification and recovery

Unit coverage exercises empty planning, rerun, partial adoption, edited-record
preservation, missing-target handling, production guards, and provider-failure
compensation. The real-Mongo integration suite additionally verifies transaction
rollback, idempotent application, reset protection, and no duplicate Site/Page
or media-intent records:

```sh
TEST_MONGODB_URI='mongodb://.../isolated_test?replicaSet=...' \
  pnpm vitest run tests/integration/seed-engine.integration.test.ts
```

Always review `seed:dry-run` and take an independently verified database backup
before a production apply. A checksum conflict is a review gate, not a reason to
edit `seed_records` manually. Correct the manifest/version or preserve the
editor-owned record. Use provider reconciliation for an unsuccessful media
compensation; never insert a fake ready File to make a seed continue.
