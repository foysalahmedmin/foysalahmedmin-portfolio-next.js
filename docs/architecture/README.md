# Architecture Decision Records

This directory contains the accepted architecture baseline for the portfolio transformation. The records describe decisions, not completed implementation. Implementation must follow the linked ADR until a later ADR explicitly supersedes it.

## Index

| ADR                                                          | Decision                                                  | Status   |
| ------------------------------------------------------------ | --------------------------------------------------------- | -------- |
| [0001](./0001-five-pillar-site-contract.md)                  | Five-pillar identity and Site ownership                   | Accepted |
| [0002](./0002-custom-ui-dependencies-and-testing.md)         | Custom UI, runtime dependencies, and test stack           | Accepted |
| [0003](./0003-typed-pages-and-publishing.md)                 | Fixed routes, typed sections, and publishing              | Accepted |
| [0004](./0004-rich-content-and-file-security.md)             | Rich-content and uploaded-file security boundary          | Accepted |
| [0005](./0005-server-session-and-dal.md)                     | Server session, capabilities, and DAL                     | Accepted |
| [0006](./0006-public-contracts-errors-and-cache.md)          | Public DTOs, errors, and Next.js 16 caching               | Accepted |
| [0007](./0007-production-topology-rate-limits-and-outbox.md) | Production topology, rate limits, idempotency, and outbox | Accepted |
| [0008](./0008-migrations-and-audit-events.md)                | Migrations and audit events                               | Accepted |
| [0009](./0009-browser-support-and-quality-profile.md)        | Browser support, runtime target, and quality profile      | Accepted |

## Record rules

- IDs are four-digit, append-only sequence numbers. Accepted records are never silently rewritten to reverse a decision.
- A material change adds a new ADR with `Supersedes`/`Superseded by` links. Small clarifications that do not change behavior may edit the original record history.
- Each record names decision owners, implementation constraints, verification, and rollback implications.
- Security, privacy, public-data, and publishing boundaries require both product-owner and repository-maintainer review before replacement.
- Dates use ISO `YYYY-MM-DD`. Application fields and API examples use the repository's `snake_case` convention.
