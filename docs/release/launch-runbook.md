# Launch runbook (Signal overhaul, Phase 10)

Status: prepared, **not run**. Every step that touches the production database, publishes content or turns on
indexing is the owner's to run or to authorise, one step at a time. Nothing in this runbook has been run against
the owner's database.

Related: [release checklist](./release-checklist.md), the plan section 8 (the confirm register) in
[`docs/plans/2026-10-08-monochrome-systems-ui-overhaul.md`](../plans/2026-10-08-monochrome-systems-ui-overhaul.md),
the truth manifest [`docs/content/content-truth.v1.json`](../content/content-truth.v1.json), ADR 0008 (migrations)
and ADR 0009 (release checklist).

## 1. What the owner must supply first

The site never shows a fact that is not `verified` or `derived`. These are the open items. Until each is answered,
the matching content stays hidden or off, which is the safe state, so launch is possible with any subset; the list
below is ordered by what changes the public site most.

| Need from the owner                                                                                     | Register         | What it unlocks                                                              | Where it goes                             |
| ------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| Price policy (none, "from" ranges or scoped per project) and typical duration for each engagement model | C-14, C-15       | The "price" and "duration" rows of the engagement models and two FAQ answers | Site editor, engagement models; FAQ items |
| Which real artifacts may be shown as deliverable samples, and how each is redacted                      | C-31             | The "What you actually receive" chapter (five samples, all off)              | Site editor, deliverable samples          |
| Contract terms (code and data ownership, NDA, payment) and post-launch support terms                    | C-16, C-17       | The "You own the code" line, two FAQ answers                                 | Commitments, FAQ                          |
| Public name, public email, phone or WhatsApp                                                            | C-01, C-03       | Hero, footer, JSON-LD, contact page                                          | Site editor, identity and contact         |
| Lead segment and the order of the others                                                                | C-10             | Headline emphasis                                                            | Site editor                               |
| Which case studies are real; for each the engagement type and whether the client may be named           | C-19             | The type filter and chip on `/case-studies` stay truthful                    | Case study editor                         |
| Outcomes and metrics per case study, with evidence and dates                                            | C-20             | Case-file outcomes and the evidence strip                                    | Case study editor                         |
| Work history, education, credentials, courses, testimonials (with written consent)                      | C-21, C-22       | The About timeline, credentials and trust sections                           | Site editor, About page                   |
| Availability wording and review date; response-time promise (only if true)                              | C-04, C-05       | Header chip, hero, contact page                                              | Site editor                               |
| Location, time zone display, overlap hours; working days and hours                                      | C-06, C-33       | Contact page and the optional working-hours bar                              | Site editor                               |
| Social links, portrait and consent, résumé download                                                     | C-07, C-08, C-09 | Footer, About                                                                | Site editor                               |
| Technology claims (hands-on level), AI providers you may name, data-handling stance                     | C-23, C-25       | Capability stack, pipeline chapter, FAQ                                      | Site editor                               |
| Legal entity, jurisdiction, retention periods                                                           | C-26             | Privacy and Terms                                                            | Legal documents                           |
| Canonical domain, go-live date for indexing                                                             | C-27             | Canonical URL, sitemap, the indexing switch                                  | Site editor, SEO                          |
| OK to add privacy-safe conversion events (no personal data)                                             | C-28             | The dashboard "Enquiries" panel (cut in Phase 7 for lack of stored events)   | A separate change                         |
| Whether the six seeded videos are yours or curated third-party picks                                    | C-29             | The Videos wording                                                           | Video editor                              |
| Approval of the derived numbers in the evidence strip and the refresh policy                            | C-30             | The evidence strip                                                           | Site editor                               |

Already answered (do not ask again): engagement models are on with the approved wording, the fit check, "How I
think" and the starting-point finder are on (the owner's instruction of 2026-11-08), the GitHub section stays on,
the hero is complete at scroll 0.

Still hidden on purpose: the five deliverable samples (C-31), prices and durations (C-14, C-15), anything the
manifest lists as `needs-owner-verification` with `production_publish: block` that the owner has not yet released.
`tests/unit/content-truth-gate.test.ts` fails if any of them is published by mistake.

## 2. Preconditions before step 1

- `main` is green: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, and the browser specs in the release checklist.
- A production database backup exists and has been restored once into a scratch database. Record the time it was
  verified; the migration refuses to run without it (`MIGRATION_BACKUP_VERIFIED_AT`, an ISO timestamp with
  milliseconds).
- Production has `AUTH_ADMIN_MFA_MODE` at its real value, a super-admin exists, and the owner can sign in.
- The currently published Site and Page values are written down or exported (see Rollback: there is no restore button).

## 3. Steps (owner runs them, in this order)

1. **Migrate.** `pnpm db:migrate:dry-run`, read the plan, then `pnpm db:migrate`. Expected: the pending migrations
   apply once and a second run changes nothing.
2. **Seed v8 in dry-run.** `pnpm seed:dry-run`. Read the diff. It adds draft records only; it must not publish.
3. **Seed v8 for real.** `pnpm seed` with the production confirmation phrase in the environment
   (`SEED_PRODUCTION_CONFIRM`, the value is `SEED_PRODUCTION_CONFIRMATION` in `src/lib/seed/policy.ts`). Everything
   lands as a draft and `allow_indexing` stays `false`.
4. **Fill the facts** from section 1 in the admin: Site editor, Pages, case studies. Use `/admin/site/review` (the
   review-and-publish workspace) to see what blocks publishing; it lists the failing gate per page.
5. **Run `scripts/launch-content.ts`** only if the owner wants the launch articles, projects, case studies and
   videos it creates. It publishes the five commitments and three next steps that the manifest still marks
   needs-owner-verification (C-18), so approve that wording first. It has not been run on the owner's database.
6. **Publish Site, then each page** from the admin. Publishing is gated by the content-truth rules; a blocked page
   says why.
7. **Check as a visitor** (a private window): home at scroll 0 shows the first hero role complete; the pinned
   chapters have skip links; `/case-studies?type=…` filters; the contact form sends one test message to the owner's
   own inbox; `/sitemap.xml` and `/robots.txt` still say noindex.
8. **Flip indexing last.** Site editor, SEO, `allow_indexing` on, publish. Then request indexing for the home page
   in the search console and set the canonical domain (C-27).
9. **Watch for a week.** Field Web Vitals, error logs, contact deliveries.

## 4. Rollback

- **Content:** there is **no one-click restore** of a previous published Site or Page (the API has publish only).
  Before step 6, write down or export the published values you are about to change; to roll back, put the old
  values into the draft and publish again. Turn `allow_indexing` back to `false` first if the problem is visible
  to crawlers. This is a known gap against the plan's "previous Site snapshot" rollback line; it is a small
  feature (store the last published snapshot and add a restore action) if the owner wants it before launch.
- **Motion and 3D:** three switches need no content change (ADR 0011, decision 8): the env flag
  `PUBLIC_3D_ENABLED=0`, the Site setting `experience.motion = off`, and the QA override `?tier=0..3`. Visitors
  can also choose "Reduced" or "Off" themselves.
- **Code:** redeploy the previous Vercel deployment. The schema changes of the overhaul are additive and optional,
  so older code reads the migrated data.
- **Database:** only from the verified backup, and only after the owner decides. Do not run `seed:reset` on
  production.

## 5. Sign-off

| Item                                                                    | Done | By    |
| ----------------------------------------------------------------------- | ---- | ----- |
| Confirm register answered or consciously left hidden                    |      | owner |
| Release checklist complete (automated and on real devices)              |      | owner |
| Content gate green on the launch commit                                 |      |       |
| Rollback rehearsed once on a staging copy (content, 3D switch, `?tier`) |      |       |
| `allow_indexing` flipped                                                |      | owner |
