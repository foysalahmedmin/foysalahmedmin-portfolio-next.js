# Soft-delete contract

All soft-deletable Mongoose schemas install the shared plugin in
`src/lib/db/soft-delete.ts`. Queries are active-only by default; raw
`is_deleted` predicates are removed so callers cannot accidentally bypass the
policy.

Trusted repository code may opt into exactly one explicit scope:

- `active` — the default; deleted records are hidden.
- `only_deleted` — trash, restore, and permanent-delete operations.
- `with_deleted` — dependency checks, migrations, and deliberate cleanup.

Index-budgeted repositories may request the internal exact-active form, which
enforces `{ is_deleted: false }` so a matching partial index is eligible. The
default active form remains `{ is_deleted: { $ne: true } }` for pre-migration
legacy readers. Public controllers cannot select either behavior.

Admin list routes accept `deleted_scope=only_deleted` or
`deleted_scope=with_deleted`. Public repositories never apply that option.
Trash responses explicitly select `is_deleted` and `deleted_at`; a null
`deleted_at` means a legacy deletion time is unknown and must not be invented.

Restore and permanent delete use immutable IDs. Category slugs are not valid
trash identifiers because partial active-record indexes permit duplicate slugs
among deleted records. Restore validates active parents and collision policy;
permanent delete refuses to orphan dependencies.

Ordinary aggregate pipelines receive the same scope match. Search, geo,
vector, metadata, and administrative first stages are rejected for scoped
aggregates until a repository supplies the stage-native visibility filter;
post-filtering top-k or metadata results is not considered correct.

File provider deletion uses a leased `deleting` claim. A failed attempt remains
non-restorable and retryable, which prevents an active File record from
pointing at an asset removed by an earlier attempt.
