# ADR 0001: Five-pillar Site contract

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Product owner and repository maintainer
- **Supersedes:** None

## Context

The current UI independently invents role labels and exposes only three hero themes. The transformed site needs one stable professional identity while keeping presentation copy editable.

## Decision

Version 1 of the canonical contract is exactly this ordered tuple:

| Order | Stable key      | Stable public label    |
| ----: | --------------- | ---------------------- |
|     1 | `frontend`      | Frontend Engineering   |
|     2 | `backend`       | Backend Engineering    |
|     3 | `ai_automation` | AI Automation          |
|     4 | `system_design` | System Design          |
|     5 | `full_stack`    | Full-Stack Development |

A small code-owned domain module will export `PILLAR_CONTRACT_VERSION = 1`, the tuple, `PillarKey`, and its Zod enum. It is the source for schemas, seeds, visual tokens, filters, and emergency labels. A key, label, order, or cardinality change requires a new ADR and data migration.

The `Site` singleton embeds the five pillar presentations inside both its draft and published snapshots. A presentation may edit supporting headline, summary, client outcome, capabilities, technologies, CTA, accent token, SEO summary, and File references. It may not edit the stable key, label, or order.

Projects, articles, services, skills, typed Page sections, analytics, and filters reference `PillarKey`; they do not reference a Pillar ObjectId or accept arbitrary strings. There is no separate HeroSlide collection: each embedded pillar owns one hero presentation, so publishing Site atomically publishes exactly five slides.

Drafts may be temporarily incomplete. Publish must reject unless all five unique keys are enabled, complete, in canonical order, and valid against contract version 1. Public readers receive only the last valid published snapshot. The compile-time contract supplies emergency identity labels only; it is not a second editable CMS.

## Ownership rules

- Product owner approves positioning, claims, and client-facing copy.
- Repository maintainer owns invariant keys, schemas, migrations, and cross-module references.
- Site editors can change presentation fields but cannot create, remove, rename, or reorder pillars.
- Components consume the published Site DTO and must not hardcode alternative professional titles.

## Consequences and constraints

- Site publish is slightly stricter, but a partial hero or inconsistent filter taxonomy cannot become public.
- Relationships remain stable across copy and media changes.
- Locale support may translate presentation copy later; keys and canonical English labels remain invariant identifiers.
- Seeds must be derived from the domain tuple and use stable keys, never duplicate a handwritten list.

## Verification

- Contract tests assert tuple order, uniqueness, cardinality, and schema parity.
- Publish tests cover missing, duplicate, disabled, reordered, unknown, and complete pillars.
- Repository checks reject independent editable role-label constants and non-enum pillar references in new modules.

## Rollback implication

The UI can roll back to a prior published Site snapshot without changing keys. Rolling back the contract itself requires a compensating migration and readers that understand every still-stored contract version; never delete or repurpose an existing key in place.
