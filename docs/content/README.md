# Content truth inventory

This directory is the committed, redacted source of truth for deciding what the portfolio may publish. It does **not** prove personal or commercial facts by itself and it must never contain private evidence.

## Files

- `content-truth.schema.json` defines the machine-readable contract and the only allowed truth statuses.
- `content-truth.v1.json` is the versioned audit of the public source at repository revision `91dddac18ee2` on 2026-07-15.
- `generated-media-direction.md` locks the P12 visual direction, 17-master production manifest, prompt grammar, pilot/QA gates, provenance template, resolved ingestion prerequisites, and remaining binding/generation blockers without claiming that media has been generated or approved.

The v1 manifest covers all hardcoded public identity/contact values, positioning, metrics, testimonials, experience, education/courses, project/article assumptions and fallbacks, social accounts, resume exposure, and the current five-pillar coverage. Project and article bodies live outside Git in MongoDB; because no approved seed/export was available, the manifest records their publication contract and blocks individual records rather than pretending to have audited them.

## Statuses are publication gates

| Status                     | Meaning                                                                                                                                                            | Production behavior                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `verified-by-code`         | A narrow statement about deterministic repository configuration or behavior. It never proves an external identity, ownership, employment, client, or outcome fact. | May publish only in that narrow scope.                        |
| `needs-owner-verification` | A real-world assertion exists in public source but lacks owner approval/evidence state.                                                                            | Block.                                                        |
| `remove`                   | Contradictory, simulated, generic, unsafe, stale, invented fallback, or unsupported social proof.                                                                  | Block and remove from public rendering.                       |
| `dynamic-derived`          | Must be computed from approved production records using the manifest rule.                                                                                         | Derive only; omit when the eligible source set is incomplete. |

Repetition in code is not corroboration. In particular, a hardcoded name, job title, social handle, company, date, number, or quote remains unverified until the owner approves it through the private workflow.

## Private owner worksheet

Create the private worksheet outside Git and access-control it. One row/record should contain:

- stable claim ID matching or extending the manifest convention;
- proposed public wording and permitted display surfaces;
- factual fields as structured values rather than prose;
- evidence type, private evidence location, and confidentiality restrictions;
- verification state (`pending`, `approved`, `rejected`, or `revoked`);
- verifier, verification timestamp, reason, and next review/expiry date;
- third-party identity/relationship and explicit publication consent where applicable;
- visibility for names, client details, live links, source links, metrics, dates, locations, contact fields, and media;
- content tier (`production` or `demo`) and record status;
- redaction/anonymization instructions.

Only an opaque approval/evidence reference may cross into application data. Do not commit contracts, certificates, IDs, private resume sources, consent files, emails, phone numbers, exact addresses, confidential client details, analytics exports, or private evidence URLs.

## Production and demo separation

Separation must be enforceable in the persistence/query layer:

1. Every managed content record has `content_tier`, `verification_state`, `visibility`, lifecycle `status`, and audit metadata.
2. Public production queries require `content_tier=production`, `verification_state=approved`, `visibility=public`, the record-specific published/completed state, and `is_deleted=false`.
3. Demo records use deterministic demo IDs plus `synthetic=true`; production APIs reject their publication.
4. Demo mode is non-production only, visibly labelled, and `noindex,nofollow`.
5. Derived metrics use exactly the production public filter. A count is never copied into a text field.
6. Missing data is omitted or shown as a neutral unavailable state. It never defaults to a person, title, category, date, outcome, link, quote, or number.

This prevents believable fixture content from leaking into the real portfolio while still allowing development and UI testing.

## Five-pillar contract

The canonical order is fixed:

1. Frontend Engineering
2. Backend Engineering
3. AI Automation
4. System Design
5. Full-Stack Development

These labels are the approved information architecture, not automatic proof of expertise. The manifest matrix records current code evidence and the missing owner-approved proof for each pillar. A capability or outcome statement may publish only when it is mapped to an approved project, article, experience, or engineering lab. Full-Stack Development is the integrative fifth pillar; it must not replace the four specific pillars.

## Update and version rules

- Patch (`1.0.x`): source locations, wording, or rationale change without changing the schema or gate outcome.
- Minor (`1.x.0`): claims are added, approval outcomes change, or record/pillar contracts expand compatibly.
- Major (`x.0.0`): status semantics, required fields, or publication behavior changes incompatibly.
- Never edit an audit silently. Update `manifest_version`, `audited_at`, and `repository_revision` in the same change.
- Claim IDs remain stable. Superseded claims keep traceability through a replacement record rather than being reassigned to a different fact.
- Approval or revocation in the CMS must create an audit event; the public cache must be invalidated immediately.

Validate both JSON files before review:

```sh
node -e "for (const f of ['docs/content/content-truth.schema.json','docs/content/content-truth.v1.json']) JSON.parse(require('fs').readFileSync(f, 'utf8'))"
```

## Audit outcome

The source audit found 88 mapped claim groups. The most urgent publication blockers are:

- five unsupported named testimonials, including an unproven conversion outcome;
- contradictory `20+` and `50+` project totals plus unsupported experience/client/mastery metrics;
- a contact form that reports success without sending a request;
- no auditable versioned project or article inventory;
- factual fallbacks that invent author/lead, category, and recency;
- duplicated unapproved contact, social, location, availability, response-time, and resume exposure;
- only three hero slides and inconsistent labels instead of the canonical five pillars;
- generic privacy/terms assertions not mapped to actual processing or legal review.

Until the owner worksheet resolves these items, redesign or seeding work must use neutral code-owned placeholders and mechanically isolated demo content—not public-looking invented facts.
