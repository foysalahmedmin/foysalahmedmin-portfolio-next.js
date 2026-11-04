# Page archetypes

Every route belongs to exactly one archetype and every archetype has one template in [`src/components/templates/`](../../src/components/templates/). A page composes a template and its sections; it never rebuilds a header, grid or call-to-action band. The machine-readable contract is [`archetypes.json`](./archetypes.json).

## Public

| Archetype       | Template             | Routes                                               | Page header | CtaBand              |
| --------------- | -------------------- | ---------------------------------------------------- | ----------- | -------------------- |
| A1 Chapter      | `ChapterPage`        | `/`                                                  | none (hero) | from the composition |
| A2 Index        | `IndexLayout`        | `/projects`, `/case-studies`, `/articles`, `/videos` | index       | yes                  |
| A3 Story        | `StoryLayout`        | `/case-studies/[id]`                                 | deferred    | yes                  |
| A4 Detail       | `DetailLayout`       | `/projects/[id]`, `/articles/[id]`, `/videos/[id]`   | deferred    | yes                  |
| A5 Narrative    | `NarrativePage`      | `/about`                                             | index       | yes                  |
| A6 Conversation | `ConversationLayout` | `/contact`                                           | index       | no                   |
| A7 Document     | `DocumentLayout`     | `/privacy`, `/terms`                                 | detail      | no                   |
| A8 System       | `SystemPage`         | not found, route errors (and the loading shell)      | none        | no                   |

"Deferred" means the detail sections still render their own hero; Phase 6 moves them onto `PageHeader`. The `contact-cta` Page section renders the same `CtaBand`; a page whose composition already contains it does not get a second one.

`SystemPage` is used twice for not found: `(common)/not-found.tsx` renders it inside the public layout (header, footer) for `notFound()` raised by a public route, and `app/not-found.tsx` renders it standalone, with its own surface and font scope, for addresses that match no route.

## Console (stubbed)

C1 `ConsoleOverview`, C2 `ConsoleList`, C3 `ConsoleEditor`, C4 `ConsoleInbox`, C5 `ConsoleSettings`, C6 `ConsoleAuth`. They define the anatomy and carry the archetype id; nothing in the admin renders them until the console shell lands in Phase 7.

## Anatomy of an inner page

1. Shell: the header (`data-chrome`) and footer.
2. `PageHeader`: a system-path breadcrumb (`~ / case-studies / name`), the H1 (`--step-5` on index pages, `--step-4` on detail pages), a lede, optional meta and actions, over a faded hairline grid. A `div`, not a `<header>`, so it adds no banner landmark.
3. The body in the archetype's grid.
4. The `CtaBand`: opposite tone (`data-tone="invert"`), the page's last element.
5. The footer returns to the page tone.

Tone rule: a page body takes the page tone, its `CtaBand` the opposite, the footer the page tone again.

## Loading, error, not found

Each route has a `loading.tsx` rendering `ArchetypeSkeleton` with the final layout's header and body dimensions, so content does not shift when it arrives. Route errors render `RouteErrorView` (A8) with the digest as the support reference.

## Adding a route

1. Pick an archetype; if none fits, raise it before building a private layout.
2. Render its template (public pages through `PublicRoutePage`, detail pages by wrapping the section in `StoryLayout` or `DetailLayout`).
3. Add the route to `archetypes.json`. `tests/unit/archetypes.test.ts` fails until you do, and `tests/e2e/consistency.spec.ts` then checks it against the contract.
4. Add a `loading.tsx` with the matching `ArchetypeSkeleton`.
