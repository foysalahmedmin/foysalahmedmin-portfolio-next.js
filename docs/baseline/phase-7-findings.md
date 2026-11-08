# Phase 7 findings: the console shell, dashboard and shared patterns (2026-11-08)

Plan section 4.3 and Phase 7 (section 7). Evidence for the acceptance lines; what was measured is separated from what was not.

## 1. What was built

The admin is on the console surface (`data-surface="console"`, set by the root script and a `SurfaceMarker`): the workbench tokens (2/4/6 px radii, no ticks or grain, Mono for ids and numbers, glass only on overlays, no `backdrop-filter` on bars or panels, no animation library).

| Part               | What it is now                                                                                                                                                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminShell`       | A 240 / 56 px rail (collapse persisted, no animated width), a solid 48 px top bar with a Mono path, an environment chip, a publish-state chip ("Published r12, draft r13: review and publish"), `Cmd/Ctrl+K`, theme, View site and a user menu; the rail is a sheet on phones |
| Console palette    | The public palette component with a console command set: every workspace (capability-filtered), create actions, Review and publish, theme, sign out; loaded lazily                                                                                                            |
| Dashboard (C1)     | Status line, **Needs attention** first (severity mark, measured fact, one deep link), an Inbox card, the publishing pipeline as pattern-filled bars with direct labels, recent activity and a system block; refresh on focus after 60 s and a manual button                   |
| Review and publish | `/admin/site/review` lists the changed fields between the draft and the published snapshot and publishes with the same call and revision guard as the Site editor, after an inline confirmation                                                                               |
| Patterns           | `ConsoleList`, toolbar, list states, `ConsoleEditor` with a section index and a sticky action bar, `ConsoleInbox` slots; the audit log is the C2 adopter and the article editor the C3 adopter                                                                                |
| Status marks       | `StatusBadge` keeps its `tone` API and renders a shape plus the word: outlined square, filled square, half square, checked square, outlined diamond, filled triangle                                                                                                          |
| Auth pages (C6)    | Sign-in, forgot and reset keep their flows; a centred glass panel over the static maquette still, one `aria-live` status region                                                                                                                                               |
| Tests              | `tests/e2e/console.spec.ts` with `tests/e2e/support/admin-session.ts` (signs in once per worker; skips without `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`)                                                                                                                    |

## 2. Acceptance

| Line                                                         | Result                                                                                                                                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell, dashboard, one list and one editor pass axe, keyboard | 13 authenticated specs pass in both colour schemes (landmarks, skip link, active page, collapse, palette jump, dashboard links, axe on four routes, the editor index and action bar)                                                   |
| Authority, route-boundary and data-boundary tests            | Unchanged and green (248 files / 1,816 tests)                                                                                                                                                                                          |
| No animation library in the admin                            | The bundle-boundary test passes; the spec checks no admin script contains ScrollTrigger, SplitText or Lenis and the engine never loads                                                                                                 |
| No `backdrop-filter` outside overlays                        | Asserted in the browser on the dashboard                                                                                                                                                                                               |
| Every "Needs attention" deep link opens the filtered view    | **Partly.** The inbox (`?status`, `?delivery_status`) and the media library (`?metadata_status`) read the URL; the content workspaces keep their filters in component state, so their links open the bare workspace until Phase 8      |
| Shell first load under 150 KB                                | **Not met as measured:** 164 KB on `/admin` (the sign-in page, which has no shell, is 160 KB, so the shell adds about 4 KB; the floor is the root layout and its providers). `/admin/audit` is 181 KB and `/admin/articles/new` 179 KB |
| Sidebar collapse                                             | Ships instant (no animated width)                                                                                                                                                                                                      |
| Console usability check on status marks (R19)                | Not run                                                                                                                                                                                                                                |

## 3. Decisions made in this phase

- **The Enquiries panel (D-08) is cut.** The observability endpoint stores no enquiry events and the plan says an unbacked panel is cut, not faked.
- **The session banner is not built.** The refresh timer fires 60 s before expiry and redirects on failure; a "2 minutes before expiry, only after a failed refresh" banner would need that timer moved, and the brief said not to change it.
- **Record search in the palette is not built** (the list endpoints make it non-trivial).
- **Dashboard counts exclude soft-deleted records** (they included them, which was a bug), and now cover case studies and videos.
- **Nested `<main>` fixed:** the loading, error and not-found views of the admin rendered a second `<main>` inside the shell's; they are a region and divs now.

## 4. Not done

- Content workspaces do not read filters from the URL; the dashboard's incomplete/stale content links open the bare workspace.
- Preview and Publish slots of the editor action bar, an unsaved-changes guard on tab close, the density toggle, the inbox `j`/`k`/`e` shortcuts: patterns exist, adopters come with Phase 8.
- No migrations summary on the dashboard (migrations are a CLI and record nothing in the database); the latest inquiry shows state and age, not topic (the snapshot has none).
- The article editor has no revision field to show.
- The design-lint allowlist still has rows for the unswept workspaces (Phase 8).
- Lighthouse, the smoothness harness and visual snapshots were not run.
