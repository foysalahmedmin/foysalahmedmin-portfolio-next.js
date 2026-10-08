# Site overhaul: "Signal", a monochrome UI/UX and content plan for the public site and the admin console

|              |                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Status**   | Draft v1.2 for owner approval (revised twice the same day). No code, seed, schema or ledger file has been changed.             |
| **Date**     | 2026-10-08                                                                                                               |
| **Scope**    | Public site **and the admin console** on one design system. API behaviour, admin behaviour and data contracts keep working; data additions are additive. |
| **Refines**  | `plan.md` phases P03 (tokens), P04 (motion), P12 (generated media), P13 (hero), P14 (homepage), P17 (About), P18 (perf)  |
| **Decision** | Needs ADR 0011 (amends ADR 0002 dependencies and ADR 0009 budgets). Drafted in Appendix C, not yet accepted.             |
| **Handoff**  | On approval, each phase in section 7 gets its own task-level implementation plan (writing-plans format) before any code. |

### Revision 1.1: what this version adds

Requested: a higher animation bar, a very smooth experience, UI consistency on every page after the home page, and an admin dashboard fixed to the same standard.

| #   | Improvement                                                                                                                                                                                         | Where                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | **Smoothness engineering:** one clock, frame rules F1 to F12, navigation feel, measured smoothness budgets, and a scripted-scroll harness that fails the build on jank.                              | 3.7.1, 6.2, 6.6             |
| 2   | **Signature motion library:** 13 more crafted effects and a motion doctrine, so the animation is designed rather than generic.                                                                       | 3.7.2, Appendix A           |
| 3   | **Consistency system:** one system on two surfaces (public "stage", admin "console"), eight public and six console page archetypes, shared page anatomy, a component contract, token-only lint, a living System lab, and a cross-page consistency probe. | 3.11 to 3.15                |
| 4   | **Admin console in scope:** monochrome console surface, calm motion, new shell, a decision-first dashboard, status marks instead of coloured badges, list/editor/inbox patterns, authenticated e2e coverage. | 3.7.3, 4.3, Phases 7 and 8  |
| 5   | **Live style and motion tile** in Phase 0, so you judge the feel in a browser before any build.                                                                                                      | Phase 0                     |
| 6   | **Roadmap is now 11 phases (P0 to P10)** with console phases and a dedicated motion-tuning pass.                                                                                                     | 7                           |
| 7   | **Mobile, touch, print and failure isolation:** a thumb-zone mobile blueprint, a print stylesheet, and a rule that any animation or 3D failure degrades silently to the static page. | 3.7.1, 3.16 |
| 8   | **New code findings:** pointer effects re-render React on every `mousemove`; a second rAF loop is about to be added; the admin animates `width` and blurs a sticky bar; 40 admin and 13 public files colour state with utilities. | 1.1                         |

### Revision 1.2: home page additions and polish

Requested: a verification pass, polish where needed, and any extra home sections worth adding.

| #   | Change                                                                                                                                                                                                              | Where           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | **Six new home sections:** Evidence strip, Deliverables you can inspect, Fit check, Starting-point finder, How I think, and a Next steps block in the final CTA; Lab list upgraded to Field notes.                   | 4.1, 5.2, 5.4   |
| 2   | **Tiering and a length budget**, so the home page does not bloat: Tier 1 ships, Tier 2 is built but hidden until its copy is confirmed; the harness fails if the page grows past the budget.                        | 4.1, 6.2        |
| 3   | **Tone rule made exact** (body, opposite CTA band, footer returns), trace rail now has eight ticks, and the final band and footer no longer contradict each other.                                                 | 3.2, 3.12, 4.0  |
| 4   | **Fixes:** stale "three case studies" (it is four), glass-3 contrast now covered by the overlay scrim, clearer pin wording, wrong effect reference on the footer wordmark.                                          | 3.5, 5.2, 4.0   |
| 5   | **Four new confirm items** (C-30 to C-33) and one design decision (D-09).                                                                                                                                           | 8               |

**How to read this.** Section 0 is the one-page summary. Sections 1 to 8 are the deliverables requested. Appendices hold the motion registry, file map, ADR outline and the anti-template checklist. Anything unknown about the owner is written `[CONFIRM:ID]` and collected in section 8.

---

## 0. Summary

**What changes.** The public site gets a new identity: monochrome (black, white, ten greys), dark-first with a light "paper" theme, glass surfaces over lit 3D forms, scroll-driven choreography, and a type system that carries the brand. The content stops listing skills and starts answering "what is slowing your business down, and how do I fix it".

**The concept: Signal.** A request enters a well-designed system, travels through it, and comes out finished. The site is built like that system. The homepage is the request's journey (ingress, triage, stack, pipeline, case files, process, trust, engage), and a thin "trace rail" shows where you are. The hero is a lit 3D maquette of a real system (gateway, services, queue, AI agent, human review gate) with a light pulse moving through it. It is not a floating particle network, which is the cliché for "AI automation" sites.

**Smooth and consistent (v1.1).** Motion is built on one clock with hard frame rules and a harness that measures jank, plus a library of crafted details (velocity-coupled pulse, boundary wipes, label-roll buttons, shared-element transitions). Every page after the home page is built from the same archetype templates, so headers, rhythm, call-to-action bands and entrance motion are identical, and each page adds exactly one signature interaction. The admin dashboard joins the same system as a calmer "console" surface: same ramp, type, focus ring and marks, compact density, no animation libraries.

**More on the home page (v1.2).** Six additions answer the questions a buyer asks next: an evidence strip of checkable numbers, "what you actually receive" with real artifacts, a fit check that says who the work is not for, an optional starting-point finder, a short "how I think", and a next-steps block before the final call to action. They are tiered so the page stays short: Tier 1 ships, Tier 2 is built but hidden until its copy is confirmed.

**What does not change.** Every route, API handler, admin workspace, the contact intake pipeline, auth/MFA, the publish and content-truth gates, the seed engine, CSP, SEO plumbing and the existing test suites keep working. Changes to data are additive and optional.

**Decisions already made by you** (from the question round):

| #   | Question          | Your answer                                                                                                                                                              |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q1  | Core areas        | Two areas shown, three stored role keys. The UI groups System Architect + Software Developer as "Systems" and AI Automation Developer as "AI Automation". No DB change.   |
| Q2  | Libraries         | Amend ADR 0002: allow GSAP, Lenis, Three.js and React Three Fiber, lazy-loaded behind repository-owned adapters. The existing custom reveal and parallax become fallback. |
| Q3  | Theme             | Dark-first plus a light "paper" theme, with inverted black/white sections for rhythm.                                                                                    |
| Q4  | Colour            | Zero colour. State is carried by icon, label, weight and pattern. Focus is a double ring in ink and paper.                                                               |
| Q5  | Clients           | All four segments (founders/SaaS, ops-heavy SMEs, agencies, enterprise teams). I recommend you pick a lead segment, see C-10.                                            |
| Q6  | Reference feel    | Technical-cinematic (dark, precise grids, subtle light, mono type).                                                                                                      |
| Q7  | Navigation        | Solutions-first: Solutions, Work, Process, Lab (projects, articles, videos), About, Contact.                                                                             |
| Q8  | Call to action    | Public email plus the contact form. No booking link in v1.                                                                                                               |

**Decisions made in revision 1.1** (tell me if you disagree):

| #   | Decision                                                                                                                           | Why                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| V1  | The admin console joins the same monochrome system, with its own calm "console" surface and compact density.                        | Consistency, and your instruction that the dashboard be fixed to the same standard.         |
| V2  | Console status uses shape + label + pattern marks, not colour.                                                                      | Keeps the brand rule while dense tables stay scannable. Fallback in D-06.                    |
| V3  | The console loads no GSAP, Lenis, Three or custom cursor (enforced by a bundle test).                                                | Calm tools, small bundles, zero risk to authority-gated flows.                              |
| V4  | Migration is a "strangler": primitives are tokenised with their legacy values as fallbacks, so the admin looks unchanged until its layout flips to the console surface in Phase 7. | No big-bang risk to a 17k-line admin.                                                       |
| V5  | One signature interaction per inner page; everything else follows the shared page-enter preset.                                    | Pages feel like one product, and each still has a point.                                     |

**What I need from you before code:** approve this plan; sign off the Phase 0 live style and motion tile (public and console; the real visual approval gate); answer the blocking items in section 8 (C-01, C-03, C-10, C-13, C-19 first).

---

## 1. Audit findings and what must not break

Read-only audit of this repo at the current `main` plus the reference project's engineering patterns.

### 1.1 Findings

| Area                | Finding                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack               | Next.js 16.1.1 (App Router, Turbopack dev), React 19.1.0, TypeScript 5.8, Tailwind CSS v4 (CSS-first `@theme inline`), MongoDB/Mongoose, Zod 4, Redux Toolkit (theme, language, direction preferences only), pnpm 10, Node 24, Vercel.                                                                                                                                      |
| Routing             | Public group `src/app/(common)`: `/`, `/about`, `/projects[/id]`, `/case-studies[/id]`, `/articles[/id]`, `/videos[/id]`, `/contact`, `/privacy`, `/terms`. Admin under `/admin/*`. 199 `route.ts` handlers under `/api/*`.                                                                                                                                                  |
| Structure           | Per-resource API modules (`model`, `repository`, `service`, `controller`, `validation`, `type`). UI in `components/{(common),sections,partials,ui,motion,content,pages,admin}`. Domain logic in `lib/{content,site,pages,seed,motion,security,metadata,...}`. 30 custom primitives in `components/ui`; no shadcn.                                                            |
| Content layer       | MongoDB-first. A published `Site` singleton (draft/published snapshots: positioning, 3 roles, process, metrics, navigation, CTAs, contact, SEO). Typed `Page` documents hold ordered `sections[]`, each a fixed `kind` (20 kinds) with an enumerated `layout`. Repeatables: Service, SkillGroup/Skill, FAQ, Testimonial, Timeline, Credential. Plus Project, CaseStudy, Article, Video. |
| How components read | Server pages call `getHomePagePayloadOrFallback()`, which returns a resolved payload. `PublicPageSections` switches on `section.kind` and passes DTOs to section components. Components never touch seeds. Deterministic fallbacks render when the database is unavailable.                                                                                                |
| Seeds               | `src/lib/seed/{foundation,launch-content,launch-library-content}.ts`, applied by a guarded, idempotent, transactional engine (`pnpm seed`). `FOUNDATION_SEED_VERSION = 7`. Content changes must bump the version or the checksum guard fails (`SEED_CHECKSUM_DRIFT`).                                                                                                    |
| Styling             | Tailwind v4 plus OKLCH variables in `assets/styles/base/variables.css` (`.dark` class, Redux theme state, pre-paint inline script). Palette is blue/indigo primary plus five pillar accents (`--pillar-*`). `--chart-*` and `--sidebar-*` are shadcn leftovers.                                                                                                              |
| Fonts               | **No web font is loaded.** `fonts.css` (Roboto) is not imported and `/public/fonts` does not exist. Body uses `var(--font-sans, "Inter Variable"), Inter, system-ui`, so visitors see the OS font. This is a free win: typography can be introduced with no regression risk.                                                                                              |
| Animation / 3D      | None of GSAP, Framer, Three, Embla. Custom engine: `MotionProvider` (preference `system/full/reduce/off`, `data-motion`, `data-motion-capability`), `ParallaxProvider` (single rAF), `Reveal` + `AnimationApplier` (IntersectionObserver), `ParallaxLayer`, `Magnetic`, and a custom `useAutoplayController` for the hero. SSR default is `reduced`, so content is never hidden before hydration. |
| Current hero        | A custom autoplay slide hero over generated colour images with blurred colour blobs: the textbook "generic hero". It is also stale: `buildPublicHero` is typed as a five-slide tuple and the labels say "of 5", while the role contract was cut to three on 2026-10-08. It gets replaced, not patched.                                                                  |
| Content state       | Seed v7 is problem-first already (role headlines, three services with outcome and deliverables, 6 FAQs, a 6-step process, 15 skills). Launch library: 6 projects, 4 case studies, 6 articles. **All case studies and projects are internal or own-platform work derived from this repository (outcomes are `derived`); there are no client case studies in the data.** The 6 videos are curated third-party YouTube links ("Recommended watching"), while the home heading "See the thinking behind the work" implies they are the owner's (see C-29). Public name, email, phone, socials, availability, metrics and testimonials are unset or `unknown`. Roles are `enabled:false` drafts. Site is `noindex`. |
| Critical function   | See 1.2.                                                                                                                                                                                                                                                                                                                                                                    |
| Admin console       | `AdminShell` is a 633-line client component: capability-filtered navigation in 5 groups, collapsible sidebar persisted in localStorage, breadcrumbs, mobile dialog with focus trap, access-token refresh timer, `BroadcastChannel` cross-tab sign-out. 26 admin components (about 17k lines); the largest are `site-admin-editor` (2,175), `media-library-workspace` (1,366) and `repeatable-record-editor` (1,145), and the shared `data-table` is 1,358. The dashboard shows a real, measured snapshot (good) inside a template look: `rounded-3xl` cards with `shadow-sm`, a blurred primary-colour blob, icon tiles and a coloured warning/success banner. `StatusBadge` colours state with emerald/amber/sky utilities. A private `/admin/design-system` page already exists (it still demonstrates role colours). Admin routes are `force-dynamic`, `noindex`, and share one generic skeleton. |
| Smoothness defects  | `components/ui/magnetic.tsx` calls `setState` on every `mousemove`, so React re-renders per pointer event. `ParallaxProvider` owns a rAF loop and the planned GSAP engine would add a second. The hero animates 120 px blurred blobs through a parallax layer. The admin sidebar animates `width` (layout every frame) and the admin header applies `backdrop-blur-md` over scrolling content (repaint per scroll frame). |
| Colour use today    | 40 admin and 13 public files use `success/warning/info/destructive` utilities; 23 admin and 44 public files use `primary`; 5 admin and 2 public files use raw palette utilities (`emerald`, `amber`, `sky`); 25 admin and 22 public files use `rounded-2xl/3xl`, the uniform rounded-card pattern this plan removes. |
| Quality baseline    | ADR 0009 sets: Lighthouse Performance ≥ 90, Accessibility ≥ 95, zero critical/serious axe findings, initial-route JS ≤ 180 KB gzip, third-party JS ≤ 60 KB gzip, mobile hero ≤ 200 KB, desktop hero ≤ 350 KB, field LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.10. Constrained profile: 360×800, DPR 2, 4× CPU, 150 ms RTT, 1.6 Mbps. The recorded July baseline is stale (pre-transformation, failed without a database), so **Phase 0 re-measures**. Tests: 174 unit files, Playwright e2e (contact, axe public-quality, visual for `/about` and `/contact`), Lighthouse CI on `/about` and `/contact`. |

### 1.2 Must not break (regression contract)

1. All public routes and URL shapes, including `[id]` detail routes, slug aliases, sitemap, robots, manifest, icons.
2. Contact intake: same-origin checks, honeypot and timing, rate limits (shared or per-instance), receipts, outbox retry, retention and anonymisation.
3. Auth, MFA, session rotation, admin route protection and the behaviour of every admin workspace: capability-filtered navigation, the access-token refresh timer, `BroadcastChannel` cross-tab sign-out, and the authority, route-boundary and data-boundary tests. Admin **behaviour** is frozen; admin **visuals** migrate in Phases 7 and 8 behind the console surface (3.1, 3.11).
4. Publish gates: Site needs exactly the contract roles to publish, Page section kinds per route, content-truth statuses (`verified`/`derived` only). Demo content never reaches production.
5. Seed and migration engines: idempotency, version/checksum rules, production confirmation phrases.
6. Managed media boundary (`storage.middleware.ts`, `ManagedMediaService`). New media goes through it. Uploaded SVG stays rejected; code-native SVG is allowed.
7. CSP (`lib/security/browser-policy.ts`): no `unsafe-eval` in production, fonts and images from `'self'` plus configured media hosts, `worker-src` restrictions. The plan avoids Draco, KTX2, Basis workers and external HDR/font hosts for this reason.
8. Cache tags and invalidation on publish, preview pipeline (`data-preview-motion`, `/admin/preview` renders the public renderer), JSON-LD and metadata builders, Web Vitals telemetry.
9. Accessibility primitives: skip link, `useDialogFocus`, async/page state components, motion preference UI, reduced-motion semantics (`motion-safe:` means `data-motion="full"`).
10. Preview parity: `/admin/preview/pages/[routeKey]` renders the public renderer in an iframe with `data-preview-motion`. New sections and layouts must render correctly there in full and reduced motion, and the motion engine stays inert inside the preview unless `data-preview-motion="normal"`.
11. Existing automated gates stay green at the end of every phase. Tests that assert the old visuals (hero carousel, pillar showcase, evidence sections) are rewritten in the phase that replaces them, never deleted without replacement.

### 1.3 Reference project: what I take and what I do not

Studied `samiularafatimon-portfolio` for **engineering only**.

| Pattern                                                            | Decision                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content as a separate data layer (`content/*.ts`, schema, checker) | Already true here, and better (DB + seed engine + truth manifest). Adopt the idea of a **content gate test** that fails if an unverified claim reaches a published snapshot.             |
| Central motion engine, GSAP + Lenis, named eases, tokens           | Adopt, but lazy-load it and hang it under the existing `MotionProvider` so one preference system governs everything.                                                                      |
| R3F hero with performance tiers and `?tier=` QA override           | Adopt the idea. My tiers differ (four, with a runtime governor and software-renderer detection, section 6.3).                                                                             |
| Reduced-motion variants per effect                                 | Adopt, and enforce with a typed registry test (Appendix A).                                                                                                                               |
| Hydration-safe reveals (no content held hostage)                   | Adopt. This repo's SSR-`reduced` default already does it.                                                                                                                                 |
| Route transitions via View Transitions                             | Adopt after a spike (Next 16.1.1 is older than the reference's 16.3).                                                                                                                     |
| e2e tests                                                          | Adopt and extend (tier-forced snapshots, motion parity, monochrome guard).                                                                                                                |
| **Not taken:** film ribbon, "house lights" tone system, boot sequence, cursor styling, copy, colour, layout | Different person, profession and palette. A boot sequence also directly harms LCP, so it is banned here.                                                                  |

---

## 2. Positioning and concept

### 2.1 Positioning statement

> For founders, operators, agencies and internal teams who are losing time and money to manual work, fragile software or AI that never leaves the demo, **{public_name}** designs the system, builds it, and automates what should not need a human: in small, reviewable steps, with every trade-off explained in plain language.

- **Promise (client side):** bring the problem; get a clear plan, working software in reviewable steps, and honest advice on what is not worth building. (From the existing `client_promise` in seed v7; owner to approve voice, C-18.)
- **Differentiator that is true by construction:** the site itself shows the method. Problem, approach, deliverable and outcome are the same four words in every section. Case files use the same four-step shape. Illustrative examples are labelled as illustrative.
- **Proof posture:** nothing that cannot be backed. Outcomes are `verified` or `derived from code`, or they are not shown. Honesty is the trust signal, and it fits an architect's brand.
- **Segments (all four selected):** founders and SaaS teams (build and architect), ops-heavy SMEs (automate), agencies and consultancies (partner), enterprise and internal teams (redesign, integrate, roll out AI). Four co-equal audiences dilute a hero. Recommendation: lead the hero with the problem, not the audience, and give each segment a short "this is for you if" line in the Engagement section. Choose a lead segment for headline emphasis (C-10).

### 2.2 Creative directions

Three directions, deliberately different. Each is judged against: expresses the profession in seconds, premium and interactive, monochrome-friendly, achievable inside ADR 0009 budgets.

#### Direction A: **Signal** (living maquette) — recommended spine

A persistent idea: the scroll is a request travelling through a system. Hero is a lit 3D maquette (chamfered node blocks, orthogonal conduits like busbars and PCB traces, engraved mono labels, a single soft key light). A white pulse travels the conduits. The pulse is also the progress indicator in a left "trace rail". Services appear as a stack of glass layers (borrowed from B). Direction C's mono annotations and command palette are borrowed too.

- **Strengths:** reads as "systems + AI automation" within seconds; one memorable signature (the pulse that follows your scroll); 3D is meaningful, not decorative.
- **Weaknesses:** highest build cost; the 3D must be tiered carefully; blur over animated canvas is expensive (see risks).
- **Why it is not the cliché:** no particles, no curved neon lines, no random network. Orthogonal routing, bevelled blocks and labels make it a recognisable architecture drawing in 3D.

#### Direction B: **Stack** (exploded glass layers)

The whole site is organised around one object: a stack of frosted glass slabs (infrastructure, software, intelligence) that separates on scroll like an exploded engineering view. Almost entirely CSS 3D, with one small WebGL accent.

- **Strengths:** best showcase of monochrome glassmorphism; light on GPU; robust on low tiers; very ownable.
- **Weaknesses:** one-trick metaphor. It explains services well but gives AI automation (movement, flow) little to do. Risk of the stock "isometric glass layers" look if drawn lazily.

#### Direction C: **Spec** (blueprint terminal)

Typography-led. Hairline blueprint grid, mono annotations, command-first navigation (⌘K), case studies as annotated architecture walkthroughs. 3D limited to a small accent.

- **Strengths:** lowest risk and cost, fastest, most accessible; strong credibility with technical reviewers.
- **Weaknesses:** fails your priority 2 ("premium and interactive", 3D, parallax) and is the least differentiated for non-technical founders.

#### Recommendation

**Signal as the spine, Stack for the Services chapter, Spec's language for annotations and the palette.** Rationale: A alone risks a one-note spectacle; B alone cannot show automation; C alone is too quiet for your stated goals. Combined, each chapter uses the device that explains its content best, and one story (the request) ties them together.

**Fallback if Phase 0 spike S1 fails the performance budget:** promote Direction B to spine and reduce 3D to the hero poster plus a small canvas. The data model and copy do not change either way, so the fallback costs design time only.

### 2.3 Information architecture and journeys

Primary nav (flat, `Site.navigation.header`): **Solutions** (`/#stack`), **Work** (`/case-studies`), **Process** (`/#process`), **Lab** (`/projects`), **About**, **Contact**, plus ⌘K, theme toggle and the primary CTA "Start a project". Articles and Videos live under Lab (a shared `LabSwitcher` row on those three pages) and in the footer. No new routes: the Page route enum is a contract. Hash links (`/#stack`, `/#process`) must pass `TSiteLink` validation **[VERIFY in Phase 4]**; if they do not, the validator is extended additively.

| Visitor                | Path                                                                                                              | Conversion point                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Founder with a pain    | Hero → Evidence strip → Triage (pick the sentence that sounds like them) → case file → Deliverables → CTA          | Contact form with topic chip pre-selected                 |
| Ops lead (automation)  | Triage → Pipeline (see guardrails: review gate, fallback, switch-off) → Engagement → CTA                           | Contact                                                   |
| Agency partner         | Engagement ("this is for you if" lines) → Process → About                                                           | Email                                                     |
| Technical reviewer     | Capability stack → Deliverables (decision record, runbook) → Lab (projects, articles) → GitHub → case file architecture | Email                                                     |

CTA rhythm: one primary CTA per viewport. Persistent in the header; repeated after Triage, after Case files and at the end. Telemetry events (privacy-safe, existing observability endpoint, no PII): `cta_click`, `triage_select(problem_key)`, `case_open(slug)`, `palette_open`, `contact_start`, `contact_submit(topic)`, `finder_complete(outcome_key)` (tier 2).

---

## 3. Design system

### 3.1 Principles

1. **Monochrome is light physics.** With no hue, depth comes from a key light, falloff, specular edges, grain and shadow. If a surface looks flat, add light, not colour.
2. **Type is the colour.** Scale, width, weight and spacing carry hierarchy. Display type is large enough to act as an image.
3. **Structure encodes information.** Numbered markers appear only where order is real (the process). Labels read as system paths (`/triage`) because the page is a journey through a system.
4. **Depth is earned.** Glass sits on something worth seeing through. Blur is budgeted.
5. **Every motion has a meaning and a reduced variant** (3.7).

**One system, two surfaces.** The tokens below are defined once and applied through `[data-surface="public"]` (the expressive "stage") and `[data-surface="console"]` (the calm admin "workbench"), plus `[data-density]` (3.11). Public is set in `src/app/(common)/layout.tsx`; console in `src/app/admin/(protected)/layout.tsx` and the auth pages. **Strangler migration:** shared primitives (`Button`, `FormControl`, `Table`, `StatusBadge`, ...) are tokenised with their *legacy values as fallbacks*, so they render exactly as today wherever no surface attribute is set. Public routes flip first (Phase 1); the admin flips in Phase 7 and then workspace by workspace in Phase 8. The five `--pillar-*` colour tokens, `--chart-*`, `--sidebar-*` and the status colours are remapped to greys (or removed) inside both surfaces, so no hue can leak.

### 3.2 Monochrome scale and semantic tokens

All values are pure neutral (OKLCH chroma 0). Hex and contrast figures below were computed, not estimated (WCAG 2.x relative luminance).

| Token           | OKLCH            | Hex       | Role                                                         |
| --------------- | ---------------- | --------- | ------------------------------------------------------------ |
| `--mono-white`  | `oklch(1 0 0)`   | `#ffffff` | Specular highlights and 3D pulses only. Never text.          |
| `--mono-50`     | `0.985 0 0`      | `#fafafa` | Paper (light background), text on dark                       |
| `--mono-100`    | `0.96 0 0`       | `#f2f2f2` | Light surface                                                |
| `--mono-200`    | `0.915 0 0`      | `#e3e3e3` | Light border, dark-theme strong text alt                     |
| `--mono-300`    | `0.85 0 0`       | `#cecece` | Secondary text on dark and on glass                          |
| `--mono-400`    | `0.74 0 0`       | `#ababab` | Muted text on dark solids                                    |
| `--mono-500`    | `0.62 0 0`       | `#868686` | Faint: decorative, disabled, large text on 950 only          |
| `--mono-600`    | `0.50 0 0`       | `#636363` | Muted text on light                                          |
| `--mono-700`    | `0.39 0 0`       | `#454545` | Secondary text on light, **backdrop ceiling behind dark glass** |
| `--mono-800`    | `0.285 0 0`      | `#2a2a2a` | Dark raised surface, hover                                   |
| `--mono-900`    | `0.20 0 0`       | `#161616` | Dark surface                                                 |
| `--mono-950`    | `0.145 0 0`      | `#0a0a0a` | Ink: dark background, text on light                          |
| `--mono-void`   | `0.095 0 0`      | `#030303` | Deepest shadow, 3D background only                           |

**Semantic tokens** (names stay compatible with existing Tailwind `@theme` mapping):

| Token                | Dark                  | Light "paper"        | Notes                                                             |
| -------------------- | --------------------- | -------------------- | ----------------------------------------------------------------- |
| `--background`       | 950                   | 50                   |                                                                   |
| `--surface-subtle`   | 900                   | 100                  |                                                                   |
| `--surface-raised`   | 800                   | white                | white used as a surface only in light theme, never as text        |
| `--surface-inverse`  | 50                    | 950                  | Inverted bands                                                    |
| `--foreground`       | 50                    | 950                  | 18.96:1 on background in both themes                              |
| `--text-secondary`   | 300                   | 700                  | 12.5:1 on 950 / 9.2:1 on 50                                       |
| `--muted-foreground` | 400                   | 600                  | 8.58:1 on 950, 7.85:1 on 900 / 5.75:1 on 50, 5.34:1 on 100         |
| `--text-faint`       | 500                   | 500                  | Decorative or disabled only. 5.44:1 on 950, 3.49:1 on 50          |
| `--primary`          | 50 on 950 button      | 950 on 50 button     | Primary button is an inversion, not a colour                      |
| `--ring`             | double: 50 over 950   | double: 950 over 50  | 2 px ink + 2 px paper. One ring always contrasts: worst case ≈ 4.4:1 at mid-grey, 12.5:1 or better at the extremes (3:1 required) |
| `--line-1/2/3/4`     | white 8/14/24/40 %    | black 8/14/24/40 %   | Hairlines. Control borders (inputs, toggles) use `--line-4` (≈ 3.8:1) to satisfy 3:1 for UI components |
| `--destructive` etc. | **removed**           | **removed**          | State = icon + label + weight + pattern (3.6)                     |

**Tones.** `data-tone="ink"` and `data-tone="paper"` on a `<section>` re-declare the semantic tokens for that subtree. The homepage alternates tones for rhythm (dark theme: ink from the hero through the case files, a paper band for Process and Engagement, ink again from the capability stack through the FAQ, a paper band for Next steps and the CTA, ink footer). One sentence governs it: a page body takes the page tone, its `CtaBand` takes the opposite tone, and the footer returns to the page tone.

**Elevation** (black shadows only, layered ambient + key): `--elev-0` none; `--elev-1` 0 1px 0 line-2; `--elev-2` 0 8px 24px /35%; `--elev-3` 0 24px 64px /45% + 0 2px 6px /30%; `--elev-4` modal.

**Shape.** Restrained, technical: control radius 2 px, panel radius 6 px, glass slab 10 px. Corner ticks (8 px L-marks) on featured panels instead of large rounded corners. Avoids the template look of uniformly rounded cards.

**Layout.** 12-column grid, container `--container-wide: 85rem`, gutters `clamp(1rem, 3vw, 2rem)`, 4 px spacing scale. Breakpoints 360, 640, 768, 1024, 1280, 1536 (matches the ADR 0009 test matrix).

### 3.3 Typography

Fonts are self-hosted at build via `next/font/google` (satisfies `font-src 'self'`). Availability on Google Fonts was verified for all three on 2026-10-08.

| Role        | Family                | Axes used                 | Why                                                                                                                                    |
| ----------- | --------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Display** | **Archivo** (variable) | `wdth 62–125`, `wght 100–900` | An industrial grotesque with a real width axis. **Expanded (wdth 112–125) at weight 700–800** for statements reads like an engineering plate. **Condensed (wdth 62–75)** for dense captions. One family covers both extremes, so width becomes the voice. |
| **Text**    | **Instrument Sans**   | `wght 400–700` (`wdth` optional) | Quiet, highly legible, slightly narrow. It stays out of the way of the display face.                                                    |
| **Mono**    | **Martian Mono**      | `wdth 75–112`, `wght 100–800` | A wide, distinctive mono with its own width axis. Labels, system paths, metrics, annotations, code. Technical flavour without Courier clichés. |

**Typographic signature (the bold move).** Width is a semantic axis: statements are set wide (capacity, scale), annotations narrow (precision). In the hero, the headline settles from `wdth 112` to `125` as the pulse reaches it. Because animating `font-stretch` reflows text, the hero uses per-line `scaleX` on masked lines (no layout), and true `font-stretch` changes are limited to hover states on small fixed-size elements.

**Fluid scale** (tokens, `clamp()`, ratio about 1.25 on mobile growing to about 1.33):

| Token         | Size                                           | Line height | Tracking  | Face / axes                  | Use                            |
| ------------- | ---------------------------------------------- | ----------- | --------- | ---------------------------- | ------------------------------ |
| `--step--2`   | `clamp(0.6875rem, 0.66rem + 0.1vw, 0.75rem)`   | 1.4         | +0.08em   | Mono wdth 75, uppercase      | Eyebrows, system paths         |
| `--step--1`   | `clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem)`  | 1.5         | +0.01em   | Text / Mono                  | Captions, metadata             |
| `--step-0`    | `clamp(1rem, 0.95rem + 0.25vw, 1.1875rem)`     | 1.6         | 0         | Text 400                     | Body (16 px min on mobile)     |
| `--step-1`    | `clamp(1.25rem, 1.1rem + 0.7vw, 1.75rem)`      | 1.4         | -0.01em   | Text 500                     | Lead                           |
| `--step-2`    | `clamp(1.5rem, 1.2rem + 1.3vw, 2.5rem)`        | 1.15        | -0.02em   | Display wdth 100, 600        | H4, card titles                |
| `--step-3`    | `clamp(2rem, 1.4rem + 2.6vw, 3.75rem)`         | 1.05        | -0.03em   | Display wdth 112, 700        | H3                             |
| `--step-4`    | `clamp(2.75rem, 1.6rem + 4.8vw, 6rem)`         | 1.0         | -0.035em  | Display wdth 118, 750        | H2 section statements          |
| `--step-5`    | `clamp(3.5rem, 1.8rem + 7.4vw, 9rem)`          | 0.95        | -0.04em   | Display wdth 125, 800        | H1                             |
| `--step-6`    | `clamp(4.5rem, 1.5rem + 11vw, 13rem)`          | 0.9         | -0.045em  | Display wdth 125, 850        | Wordmark, CTA statement        |

Rules: `font-variant-numeric: tabular-nums` for metrics; `text-wrap: balance` on headings and `pretty` on body; measure 62–68 ch; mono never below 11 px; headings are real `h1..h4`, never styled `div`s.

**Payload plan (spike S3).** Variable fonts with two axes can be large. Target ≤ 150 KB woff2 for the fonts that block first paint (Display and Text, preloaded) and lazy Mono (`display: swap`, not preloaded). If the full variable file is too heavy, pin ranges with `fonttools` (`wdth 100–125`, `wght 400–850`) and serve via `next/font/local`. Fallback stack is metric-matched (`size-adjust`) to avoid CLS.

### 3.4 Making monochrome feel premium (the depth recipe)

| Device                     | Spec                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Key-light falloff          | One radial gradient per hero-scale surface, top-left origin, white 6–10 % to transparent. Greys only. No hue gradients.                        |
| Specular edge              | `inset 0 1px 0 white/22%` on top edges, `inset 0 -1px 0 black/40%` on bottom edges of raised surfaces.                                           |
| Grain                      | One static 160 px greyscale noise PNG (`/public/textures/grain.png`, ≈ 10–16 KB) over the page at 3–5 % opacity, `pointer-events:none`, no blend mode (cheap). Self-hosted file, not a data URI, to keep `img-src` tight. |
| Layered surfaces           | Three tones per theme (background, subtle, raised) and a fixed vignette (radial dark corners, 8 %).                                             |
| Hairlines and marks        | 1 px `--line-*` rules, corner ticks, grid registration crosses at section edges.                                                                |
| Area textures              | Each role owns a CSS-gradient texture (no files): System Architect = blueprint grid, Software Developer = stacked lines, AI Automation = dot matrix. This replaces the old per-role accent colours. |
| Inversion                  | Tone bands flip the whole palette, giving rhythm without colour.                                                                                |
| Lit 3D forms               | Real lighting on the maquette (3.8). This is the backdrop that makes glass worth having.                                                        |

**Images.** All public media gets `filter: grayscale(1) contrast(1.05)` via a `[data-mono-media]` rule (images, video posters, YouTube thumbnails, iframes). Reversible, no pipeline change, and it guarantees any colour upload stays on-brand. The hero poster is rendered from the 3D scene itself (3.8). Generated colour hero candidates from P12 are retired, not ingested. The Google Map embed on Contact is replaced by a greyscale city-only static block, or removed, per C-06.

### 3.5 Glass specification

Glass is only used where a rich backdrop exists (the 3D scene, textured bands, pinned layers).

```css
[data-surface="public"] {
  --glass-1-bg: oklch(1 0 0 / 0.05);   /* chips, header */
  --glass-2-bg: oklch(1 0 0 / 0.08);   /* cards, panels */
  --glass-3-bg: oklch(1 0 0 / 0.12);   /* palette, modals */
  --glass-blur-1: 12px;  --glass-blur-2: 20px;  --glass-blur-3: 32px;
  --glass-brightness: 1.08;            /* lifts the backdrop slightly */
  --glass-contrast: 1.05;
  --glass-saturate: 0;                 /* forces any colour under glass to grey */
  --glass-edge: inset 0 1px 0 oklch(1 0 0 / 0.22), inset 0 0 0 1px oklch(1 0 0 / 0.08),
                inset 0 -1px 0 oklch(0 0 0 / 0.4);
  --glass-fallback: oklch(0.2 0 0 / 0.94);
}
.glass-2 {
  background: var(--glass-2-bg);
  backdrop-filter: blur(var(--glass-blur-2)) brightness(var(--glass-brightness))
                   contrast(var(--glass-contrast)) saturate(var(--glass-saturate));
  box-shadow: var(--glass-edge), var(--elev-2);
}
@supports not (backdrop-filter: blur(1px)) { .glass-2 { background: var(--glass-fallback); } }
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass-2 { background: var(--glass-fallback); backdrop-filter: none; box-shadow: inset 0 0 0 1px var(--line-4); }
}
@media (forced-colors: active) { .glass-2 { background: Canvas; backdrop-filter: none; border: 1px solid CanvasText; } }
```

`saturate()` does nothing on a neutral backdrop, so it is kept only as a guard (value 0 greys out any stray colour image). The visible effect comes from blur, brightness and contrast.

**Contrast rules (computed, gamma-space compositing as browsers do):**

| Rule                                                                                                          | Evidence                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Dark glass alpha ≤ 0.08 for any panel carrying body text.                                                      | At alpha 0.12 and backdrop 700, primary text drops to 6.5:1 and muted text fails.             |
| **Backdrop ceiling:** the region behind dark-theme glass text must be ≤ `--mono-700` (`#454545`).              | Over 700 at alpha 0.08: text-50 = 7.28:1, text-300 = 4.81:1. Over 600: 4.77 / 3.15. Over 500: 3.07 (fail). |
| Muted text on glass uses `--mono-300`, not 400.                                                                 | 400 on glass over 700 = 3.29:1 (fail). 400 on solid 800 = 6.2:1 (pass).                       |
| Light glass: white alpha ≥ 0.70 and text `--mono-700`, over any backdrop lighter than `--mono-500`.             | 700 text over 0.70 glass on backdrop 500 = 6.92:1; on 300 = 8.44:1.                           |
| `--glass-3` (alpha 0.12) is used only on top of the `--overlay` scrim, which keeps the backdrop at or below `--mono-800`. | Over 800 at alpha 0.12: text-50 = 9.39:1, text-300 = 6.20:1.                                  |
| Enforced by tests, not good intentions.                                                                        | Token-matrix unit test plus a Playwright pixel-sampling check under every glass text box.     |

**Budgets.** Max 3 simultaneously visible blurred layers on desktop, 2 on mobile. Blur radius ≤ 24 px desktop, ≤ 12 px mobile. No glass inside glass (inner elements use a flat translucent fill). **No `backdrop-filter` over an animating canvas on tier T2 or below** (solid translucent instead). On T3, glass over the canvas is limited to one panel plus small chips, and is measured in spike S1 because the backdrop is recomputed every frame.

### 3.6 State without colour

| State   | Treatment                                                                                          |
| ------- | -------------------------------------------------------------------------------------------------- |
| Focus   | Double ring (ink + paper), 2 px each, offset 2 px. One ring contrasts on every grey (worst case ≈ 4.4:1). |
| Error   | Heavy-weight label "Error:" + glyph + dashed inverted border + `aria-live`. Message says what failed and how to fix it. |
| Success | Check glyph + label + solid inverted border. Toast uses the glass-3 tier.                           |
| Disabled | `--text-faint`, striped hatch fill, `aria-disabled`, cursor not-allowed.                            |
| Verification | `Verified` (filled square), `Derived from code` (half-filled square), `Unverified` (outlined, hidden publicly). |

### 3.7 Motion language

**Grammar.** Every effect must declare a trigger, a meaning and a reduced variant. Four meanings:

| Meaning      | What the viewer should feel                | Typical effects                                           |
| ------------ | ------------------------------------------ | --------------------------------------------------------- |
| **Transmit** | Work flows through a system                | Pulse along conduits, trace rail, pipeline travel         |
| **Resolve**  | Noise becomes clarity                      | Headline line reveal, mono decode, counters               |
| **Assemble** | Structure is deliberate                    | Grid draw-in, stack explode, wire draw, diagram build     |
| **Respond**  | The system listens to you                  | Magnetic CTAs, cursor-reactive depth, sheen, palette      |

**Tokens** (single source `src/lib/motion/tokens.ts`, mirrored to CSS variables):

| Token        | Value                                  | Use                                  |
| ------------ | -------------------------------------- | ------------------------------------ |
| `dur.micro`  | 120 ms                                 | Hover, press                         |
| `dur.fast`   | 200 ms                                 | Toggles, chips                       |
| `dur.base`   | 360 ms                                 | Reveals, panels                      |
| `dur.slow`   | 640 ms                                 | Line reveals, wipes                  |
| `dur.scene`  | 1100 ms                                | Chapter entrances                    |
| `ease.signal`  | `cubic-bezier(0.16, 1, 0.3, 1)`      | Default entrance (expo-out feel)     |
| `ease.settle`  | `cubic-bezier(0.22, 0.8, 0.2, 1)`    | Layout settle                        |
| `ease.snap`    | `cubic-bezier(0.7, 0, 0.2, 1)`       | Exits, wipes                         |
| `scrub.lag`    | 0.6 s                                | Scroll-linked smoothing              |
| `stagger.line` | 80 ms                                | Headline lines                       |

**Choreography rules** (so it feels like one system):

1. One master timeline per chapter; effects inside it share easing and tokens. No stray `transition: all`.
2. Only `transform`, `opacity` and `clip-path` animate. No layout properties.
3. At most two pinned scenes on the homepage (Stack and Pipeline), each ≤ 250–300 vh, always skippable (anchor links jump past them, keyboard scrolling works normally, and the reduced layout has no pins). No horizontal scroll hijacking.
4. Entrance order is fixed: structure (lines, grid) first, then headings, then body, then controls.
5. **Never hide the LCP element or primary content before JS.** Enhancement is additive: server HTML is complete and visible; the hero animates around the headline and settles it, it does not start from `opacity:0`.
6. Smooth scroll (Lenis) only when `effectiveMotion === "full"` and pointer is fine. Native scroll position is kept, so find-in-page, anchors and keyboard scrolling keep working.
7. Pointer effects are fine-pointer only. All hover-revealed information has a focus and tap equivalent.
8. Nothing flashes above 1 Hz. No sound. No preloader or boot screen.

**Reduced variants.** `reduced` (OS setting or user choice): final state immediately, with opacity-only 150 ms fades where a transition aids comprehension; no parallax, no pins, no smooth scroll, no 3D motion (poster or still scene). `off`: final state, no transitions at all. Parity is tested: the reduced render equals the end frame of the full-motion render.

The full registry (35 public effects and 7 console effects) with trigger, meaning, tokens, tier and reduced behaviour is Appendix A. Sections 3.7.1 to 3.7.3 add the smoothness rules, the signature library and the console preset.

### 3.7.1 Smoothness engineering (how it stays at 60 fps)

"Top-class" animation is mostly frame discipline: motion that is slightly less ambitious but never drops a frame feels better than motion that is rich and janky. The rules below are requirements enforced by the smoothness harness (6.6), not tips.

**One clock.** A single `requestAnimationFrame` loop drives everything. The GSAP ticker feeds Lenis (`lenis.raf`), ScrollTrigger (`lenis.on("scroll", ScrollTrigger.update)`) and the 3D renderer (`frameloop="never"`, advanced from the ticker only while the hero is visible). `gsap.ticker.lagSmoothing(0)` stops scroll "catching up" in a jump. The existing `ParallaxProvider` loop becomes a subscriber of the same ticker when the engine is active and keeps its own loop only on the T1 path.

| #   | Rule                                                                                                                                                                                   | Why                                                                         | Enforced by                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| F1  | Animate only `transform`, `opacity` and (on promoted layers) `clip-path`. Never layout properties. `filter: blur` only on small static elements.                                          | Compositor-only work does not touch main-thread layout or paint.            | Motion registry check; trace assertion: no layout in animation frames |
| F2  | Measure once, animate many. Sizes and offsets are cached at `ScrollTrigger.refresh`; no `getBoundingClientRect` inside scroll or pointer callbacks.                                       | Avoids forced synchronous layout.                                           | Code review checklist; long-animation-frame threshold             |
| F3  | Pointer effects write transforms through `gsap.quickTo` or CSS variables on the shared tick. **Never React state per pointer event.**                                                    | A `setState` on every `mousemove` re-renders React 60+ times a second (current `Magnetic` does this). | Component test: a pointer sequence causes at most one render      |
| F4  | `will-change: transform` only while an element animates or is within one viewport of doing so; at most about 40 promoted layers on screen.                                              | Too many layers exhaust GPU memory and slow compositing.                    | Layer counter in the `?debug=perf` overlay                        |
| F5  | Off-screen work stops. Scrubs and loops pause when their section is more than one viewport away. Long static sections use `content-visibility: auto` with `contain-intrinsic-size` (never on pinned or animated sections). | Cuts style, layout and paint cost on a long page.                           | Trace budget                                                      |
| F6  | Layout is reserved before motion: `aspect-ratio` on all media, metric-matched font fallbacks, `scrollbar-gutter: stable`, nothing inserted above content after load. Animation never changes layout. | CLS and jank both come from layout moving.                                  | CLS ≤ 0.05 gate                                                   |
| F7  | Decode before reveal. Wipe-in images call `img.decode()` first; the hero poster is `priority`; others use `loading="lazy"` and `decoding="async"`.                                       | Main-thread image decode causes the classic reveal hitch.                   | Visual run plus long-animation-frame threshold                    |
| F8  | Slice heavy work. Scene build, ScrollTrigger creation and font-dependent measurement run in slices of 8 ms or less (`scheduler.postTask` or `requestIdleCallback`, with a fallback).        | No single main-thread task over 50 ms.                                      | Long-animation-frame threshold                                    |
| F9  | Every animation is interruptible and killable. `useGSAP` reverts on unmount; nothing blocks input with `pointer-events: none` for more than 120 ms.                                       | Fast users and route changes never fight a running timeline.                | E2E: navigate mid-animation                                       |
| F10 | One debounced `ScrollTrigger.refresh` (250 ms) on resize, on `document.fonts.ready`, and after pinned-section media loads. `ignoreMobileResize` for URL-bar collapse. Use `svh`/`dvh`.  | Stale trigger positions make pins jump.                                     | E2E: resize and font swap                                         |
| F11 | Hidden tab means no frames. Ticker and renderer sleep on `visibilitychange`; videos pause.                                                                                                | Battery and heat.                                                           | 3D smoke test                                                     |
| F12 | Free GPU memory. Dispose geometries, materials and textures on unmount; call `renderer.dispose()`.                                                                                       | Navigation must not leak.                                                   | Heap check after 10 route changes                                 |

**Failure isolation (F13).** The page is complete without the engine. If the GSAP, Lenis or 3D chunk fails to load, throws, or is blocked, the site falls back to tier T1 for the session, keeps all content visible and interactive, and records an `engine_load_failed` event (no PII) to the existing telemetry. No error boundary may take down a route because of an animation.

**Navigation feel.**

| Moment            | Behaviour                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Click or tap      | Visual acknowledgement in 50 ms or less (press state, `scale(0.98)`), before any network work.                                                                                                                                                                                                                              |
| Prefetch          | Links prefetch on visibility (Next default). Case-file rows, nav items on hover or focus intent, and the highlighted ⌘K result call `router.prefetch`.                                                                                                                                                                      |
| Route change      | View Transition (M18): header, trace rail and cursor persist (`view-transition-name`); only `main` transitions. A case-file row thumbnail morphs into the detail hero (M30).                                                                                                                                                |
| Loading           | Every route has a `loading.tsx` that mirrors the final archetype layout (same header height, same grid), so the swap from skeleton to content moves nothing. Data-heavy blocks below the fold (GitHub calendar, related items) stream behind `Suspense` with `SectionSkeleton`. Skeleton to content is a 150 ms crossfade. |
| Scroll position   | A new navigation starts at the top (`immediate`). Back and forward restore the exact position, including under Lenis.                                                                                                                                                                                                       |
| Anchors           | `lenis.scrollTo` with the header offset, then focus moves to the target heading (`tabindex="-1"`) for keyboard and screen-reader users.                                                                                                                                                                                      |
| Overlays          | Opening a modal, sheet or palette calls `lenis.stop()`. Scrollable children (code blocks, tables, the palette list, textareas) carry `data-lenis-prevent`.                                                                                                                                                                  |

**Smoothness budgets** (measured by the harness on a scripted 10 s scroll plus hover and click run, per ADR 0009's profiles):

| Profile                                   | Budget                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Desktop (1440×900, no throttle)           | p95 frame interval ≤ 18 ms; dropped frames ≤ 2 %; at most 2 long animation frames (> 50 ms) after hydration |
| Constrained mobile (4× CPU, tier T2)      | p95 frame interval ≤ 33 ms; dropped frames ≤ 8 %                                                        |
| Interaction latency (lab)                 | INP p75 ≤ 100 ms on primary interactions (the field gate stays ≤ 200 ms)                                |
| Navigation                                | Visual response ≤ 100 ms after click; prefetched routes show content ≤ 300 ms                           |

### 3.7.2 Signature motion library (what makes it feel crafted)

**Motion doctrine.**

1. **Timing hierarchy.** The primary element leads, the secondary follows by one stagger step, the tertiary by two. Never more than three moving groups in view.
2. **Enter slower than exit.** Enter 360 to 640 ms, exit 160 to 240 ms. Duration scales with distance.
3. **Distance discipline.** Body blocks rise 16 px or less. Statements use masked lines (travel is 100 % of line height inside a clip) instead of large translations.
4. **Scroll-linked motion is linear in progress.** Smoothness comes from `scrub.lag`, never from easing the progress curve; an eased scrub feels sticky.
5. **Pointer motion has inertia.** Values follow the pointer through a critically damped spring (`quickTo`, 0.4 to 0.6 s), not a snap.
6. **Stagger caps.** 60 to 90 ms per item, total 600 ms or less, groups of 12 or fewer; beyond that, items arrive together.
7. **Motion explains.** Things travel from where they came from to where they live (pulse from row to panel, card to detail page). Nothing appears from nowhere.
8. **Rest is a feature.** After the entrance the page is still. The only ambient motion on the site is the maquette's idle pulse loop.

**Signature details** (all registered in Appendix A with reduced variants):

| ID  | Detail                | Spec                                                                                                                                                                       |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M23 | Velocity coupling     | Scroll speed scales the pulse speed (1 to 3×) and skews large statement lines up to 3°, damped. The meaning: your scroll speed is the system's throughput. Tier T3 only.    |
| M24 | Boundary wipe         | A new tone band reveals through `clip-path` as it crosses 80 % of the viewport, scrubbed over 30 vh. A hairline draws along the boundary first.                             |
| M25 | Frame parallax        | A static clip frames an image that translates ±8 % (scale 1.12) with scroll. Depth without moving the layout.                                                              |
| M26 | Underline draw        | Link underlines draw from the left on hover and focus and retract to the right on leave, so the motion keeps its direction.                                                  |
| M27 | Label roll            | Button labels roll up inside a clip on hover, arrow nudges, press scales to 0.98 in 50 ms, and loading morphs the label to a spinner glyph without changing the button width. |
| M28 | Nav indicator         | One indicator slides between nav items by transform (FLIP), with the same inertia as the cursor.                                                                           |
| M29 | Glass tilt            | Featured glass panels tilt up to 3° toward the pointer and spring back. Never on lists or text-heavy panels.                                                               |
| M30 | Shared-element morph  | The case-file row thumbnail becomes the detail hero via View Transition names; the palette result flies to its page title.                                                  |
| M31 | Path draw             | SVG strokes draw with a tapered pulse head (pipeline, process wire, case diagrams). The same visual device everywhere.                                                    |
| M32 | Field focus           | The label lifts and a bottom line draws on focus; a success mark draws its check; an error flashes an inverted border once with the message (no shake).                     |
| M33 | Skeleton breathe      | Skeleton opacity eases 0.55 ↔ 1 over 1.4 s. Static in reduced motion.                                                                                                      |
| M34 | Reading progress      | A hairline fills across the top of articles and case files with scroll.                                                                                                    |
| M35 | Header hide and show  | The header hides after a fast downward scroll (80 px or more), returns on upward intent, and never hides while focus is inside it.                                         |

**Easing and timing tokens** from 3.7 stay the only values in use; the library adds no new curves. `ease.signal` is the default for entrances, `ease.snap` for exits and wipes, and springs are expressed as `quickTo` durations rather than new curves.

### 3.7.3 Console motion ("calm" preset)

The console must feel fast and quiet. It uses the same tokens, shortened, and none of the cinematic machinery.

| ID  | Effect                  | Spec                                                                                                       | Reduced        |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------- | -------------- |
| C01 | State transitions       | Hover, focus, selected: 100 to 160 ms, colour-free (fill steps along the ramp).                             | Instant        |
| C02 | Route content fade      | `main` fades in 150 ms after the skeleton; the shell never re-animates.                                     | Instant        |
| C03 | List insert and remove  | FLIP, 180 ms, so the eye follows what changed.                                                            | Instant        |
| C04 | Toast                   | Enter 160 ms, auto-dismiss at 5 s (errors persist until dismissed); glass-3.                                | Instant        |
| C05 | Skeleton breathe        | M33, rows sized exactly as final rows.                                                                     | Static         |
| C06 | Sidebar collapse        | `grid-template-columns` over 160 ms with `contain: layout`; kept only if the harness shows no dropped frames, otherwise instant. | Instant |
| C07 | Dialog, drawer, palette | Fade and 8 px rise, 160 ms; focus trapped and restored.                                                    | Instant        |

Not used in the console: Lenis, scroll scrubs, parallax, 3D, custom cursor, magnetic buttons, text splitting, count-up (numbers are static and exact), page-transition wipes.

### 3.8 3D language ("the maquette")

- **Subject:** a miniature of a real system: ingress gateway, service blocks, database, queue, AI agent core, human review gate, egress. About 40–60 blocks plus orthogonal conduits. Blocks are bevelled rounded boxes; conduits are thin boxes routed at right angles; each block carries an engraved mono label (rendered as DOM labels projected onto the scene so text stays crisp, selectable and translatable).
- **Zones = roles.** Foundation grid plane (System Architect), stacked service slabs (Software Developer), agent core with pulse paths (AI Automation). Hovering or focusing a role label in the hero highlights its zone and swaps the glass info panel.
- **Material:** greyscale PBR, node bodies 800–900, edges and conduits 300–400, pulses `--mono-white` emissive. Light theme renders the same scene as matte "clay" (bodies 100–200, soft ambient occlusion look via baked contact shadows, ink-coloured conduits).
- **Lighting:** one soft key light top-left, a faint rim light, and a **procedural environment from Lightformers** (zero download, CSP-safe). Contact shadows baked once (`frames={1}`). No post-processing; glow is a pooled sprite.
- **Camera:** perspective, slight downward angle; pointer rig lerps ±4°; scroll dollies from overview to a close-up of the agent zone over the first 120 vh, then the canvas fades out and unmounts.
- **Geometry budget:** ≤ 150k triangles, ≤ 40 draw calls (instancing), textures ≤ 16 MB, no external model, HDR, Draco or KTX2 file.
- **Accessibility:** canvas is `aria-hidden`. All meaningful content is DOM. A visible pause/"still image" control sits in the motion preference UI.
- **Poster:** the LCP-safe server-rendered `<picture>` is generated from the same scene (`scripts/render-hero-poster.ts`, Playwright capture, AVIF/WebP, ≤ 60 KB mobile, ≤ 120 KB desktop; ADR 0009 caps are 200 / 350 KB). The canvas cross-fades over an identical composition, so there is no layout shift.

### 3.9 Iconography and imagery

- A small custom thin-line glyph set (24 px grid, 1.5 px stroke, square caps) for the three roles and system concepts (gateway, queue, agent, review gate). Lucide stays for UI chrome (tree-shaken, ADR 0002). No emoji.
- Portrait: greyscale, grain, hard side light; alt text and consent per C-08.
- Screenshots in case files sit in a plain hairline frame, not a fake browser or device mock.

### 3.10 Voice and microcopy

Plain verbs, sentence case, active voice, first person ("I"), specific over clever. One vocabulary everywhere: **Problem, Approach, Deliverable, Outcome**. Actions keep names through a flow ("Send" → toast "Sent"). Errors never apologise and always say what failed and what to do. Empty states are invitations ("No case files are published yet. Read how this site was built instead.").

### 3.11 One system, two surfaces, two densities

The public site persuades; the console operates. They share one system and differ only in the properties below, which are driven by `data-surface` and `data-density`.

| Property            | Public "stage" (`data-surface="public"`, `comfortable`)                            | Console "workbench" (`data-surface="console"`, `compact`)                                          |
| ------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Job                 | Persuade and convert                                                               | Operate and decide                                                                                 |
| Controls            | 44 to 48 px high; base text 17 to 19 px                                            | 36 px high with a 44 px hit area on coarse pointers; UI text 14 px                                 |
| Colour              | Mono ramp, tone bands (ink and paper)                                              | Same ramp; no tone bands; page plus one raised step                                                |
| Type                | Expanded Display statements, Mono labels                                           | Display only for the page title (wdth 100 to 112, wght 600 to 700); Text for UI; Mono for IDs, timestamps, counts and tabular data |
| Radius and shape    | 2 / 6 / 10 px, corner ticks                                                        | 2 / 4 / 6 px, no ticks                                                                             |
| Glass               | Tiers 1 to 3                                                                       | Overlays only (palette, dialogs, drawer, toasts). No `backdrop-filter` on sticky bars or panels    |
| Grain, vignette     | On                                                                                 | Off                                                                                                |
| Motion              | Full choreography (3.7)                                                            | Calm preset (3.7.3)                                                                                |
| 3D, Lenis, cursor   | Yes, tier-gated                                                                    | Never (bundle test)                                                                                |
| Width               | Wide 1360 px, 12 columns                                                           | Fluid, content capped at 1600 px, 12 columns                                                       |
| Default theme       | Dark (D-02)                                                                        | System (long sessions; D-07)                                                                       |

Shared by both: the ramp, fonts, double-ring focus, status marks, icon set, form controls, tables, overlays, copy vocabulary, skeleton, empty and error patterns.

### 3.12 Page archetypes and route map

Every route belongs to exactly one archetype, and every archetype has one template in `src/components/templates/`. A page composes a template and its sections; it never rebuilds a header, grid or call-to-action band.

| Archetype            | Template (new)           | Used for                                                            |
| -------------------- | ------------------------ | ------------------------------------------------------------------- |
| A1 Chapter           | `ChapterPage`            | Home: chapter sections with trace rail, pins, 3D                    |
| A2 Index             | `IndexLayout`            | Case files, Projects (Lab), Articles, Videos                        |
| A3 Story             | `StoryLayout`            | Case study detail: sticky diagram plus four chapters                |
| A4 Detail            | `DetailLayout`           | Project, Article, Video detail (reading column plus sticky aside)   |
| A5 Narrative         | `NarrativePage`          | About                                                               |
| A6 Conversation      | `ConversationLayout`     | Contact                                                             |
| A7 Document          | `DocumentLayout`         | Privacy, Terms                                                      |
| A8 System            | `SystemPage`             | 404, error, loading                                                 |
| C1 Overview          | `ConsoleOverview`        | Dashboard                                                           |
| C2 Workspace list    | `ConsoleList`            | Projects, Case studies, Articles, Videos, Project resources, Taxonomy, Users, Audit, Media |
| C3 Editor            | `ConsoleEditor`          | New and edit forms, Site settings, Pages                            |
| C4 Inbox             | `ConsoleInbox`           | Contact inbox, Review moderation                                    |
| C5 Settings          | `ConsoleSettings`        | Profile settings                                                    |
| C6 Auth              | `ConsoleAuth`            | Sign-in, forgot password, reset password                            |

**Public route map.** Each page gets exactly one signature interaction; everything else is the shared page-enter preset (3.13).

| Route                              | Archetype | Signature interaction (the only page-specific motion)       | Tone sequence                    |
| ---------------------------------- | --------- | ----------------------------------------------------------- | -------------------------------- |
| `/`                                | A1        | Signal pulse and trace rail                                 | ink, paper band (process, engagement), ink, paper CTA band |
| `/case-studies`                    | A2        | Row preview on hover and focus                              | ink body, paper CTA band         |
| `/case-studies/[id]`               | A3        | Diagram sync with chapters (M17)                            | ink body, paper CTA band         |
| `/projects`, `/articles`, `/videos` | A2       | Lab switcher indicator (M28); row preview; poster hover      | ink body, paper CTA band         |
| `/projects/[id]`, `/videos/[id]`   | A4        | Gallery or player frame                                     | ink body, paper CTA band         |
| `/articles/[id]`                   | A4        | Reading progress (M34)                                      | ink body, paper CTA band         |
| `/about`                           | A5        | Portrait frame parallax (M25) and timeline wire (M19)       | ink, paper band (How I think), ink, paper CTA band    |
| `/contact`                         | A6        | Topic chips and field focus (M32)                           | ink panel, no CTA band           |
| `/privacy`, `/terms`               | A7        | Reading progress (M34)                                      | ink, no CTA band                 |
| 404, error, loading                | A8        | Static maquette still (404)                                 | ink                              |

Tone rule: a page body is ink in the dark theme (paper in light); the CTA band takes the opposite tone and the footer returns to the page tone, so every page ends with the same inversion.

### 3.13 Shared page anatomy

Public inner pages, top to bottom, are identical on every page:

1. **Shell:** header and footer as in 4.0.
2. **`PageHeader`:** a Mono system-path eyebrow (it doubles as the breadcrumb on detail pages, for example `/case-files/portfolio-platform`), the H1 (`--step-5` on index pages, `--step-4` on detail pages), a lede (`--step-1`, 62 ch), an optional Mono meta row (type, date, reading time) and actions. A drawn hairline grid fragment sits behind it. Padding: `--space-section-compact` above, `--space-6` below.
3. **Body** in the archetype's grid: index = filter bar plus results; detail = 46 rem reading column plus sticky aside; story = sticky diagram plus chapters; document = reading column.
4. **`RelatedBand`** where relevant (next case file, related articles): the same list component as home Ch.7b.
5. **`CtaBand`:** the same component as home Ch.9 in the opposite tone. Copy varies per page through data (`contact-cta`); layout never does.
6. **Footer.**

**Rhythm.** Section padding `--space-section` (desktop) and `--space-section-compact` (≤ 768 px). 12 columns with 24 px gutters at 1024 px and up, 16 px below. Headings never skip a level. Container, gutter and breakpoints come from the layout primitives only.

**Page-enter preset (identical everywhere, runs once per navigation, at most 1.2 s):** hairline draws (300 ms) → title lines (600 ms, `stagger.line`) → meta decodes (400 ms) → body blocks rise in reading order (total capped at 600 ms). Reduced motion renders the final state at once.

### 3.14 Component contract

One implementation per component, used by both surfaces; density comes from context.

| Group      | Components                                                                                                     | Variants                                              | States covered                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| Actions    | `Button`, `IconButton`, `LinkButton`, `TextLink`                                                               | primary (inverted), secondary (outline), ghost, link; sm/md/lg | default, hover, focus, active, disabled, loading |
| Inputs     | text, textarea, select, combobox, checkbox, radio, switch, file and media                                      | label, help and error layout; sizes by density        | plus invalid, read-only, dirty (console)                    |
| Display    | `Panel` (flat, glass-2, inverse), `Tag`, `StatusMark`, `Metric`, `Timeline`, `CodeBlock`, `MediaFrame`, `DiagramFrame`, `DefinitionList` | tone through `data-tone` only                         | default, interactive, selected                              |
| Navigation | `Breadcrumb` (system path), `Tabs`, `Pagination`, `LabSwitcher`, `NavIndicator`, `Sidebar` (console)           |                                                       | current, disabled                                           |
| Feedback   | `Toast`, `Alert`, `Skeleton`, `EmptyState`, `ErrorState`, `ProgressLine`, `Tooltip`                            |                                                       | info, success, error, loading                               |
| Overlay    | `Modal`, `Drawer`, `CommandPalette`, `Popover`                                                                 | glass-3                                               | open, close, focus trap                                     |
| Data       | `DataTable`, `List`, `RowPreview`                                                                              | density-aware                                         | sortable, selected, loading, empty, filtered-empty, error   |

Rules: variants are declared with `class-variance-authority` (already installed). No component accepts a raw colour, radius or shadow prop. Sizes derive from density tokens. Each component appears in the System lab with every state in both themes, both densities and both surfaces.

### 3.15 Governance (how consistency is kept)

1. **Token-only lint.** `tests/unit/design-lint.test.ts` scans `src/components` and `src/app` and fails on colour literals (`#`, `rgb`, `hsl`, `oklch` outside token files and the 3D material helper), Tailwind palette utilities, arbitrary `rounded-[…]`, `shadow-[…]` and `bg-[…]` values, and `rounded-2xl/3xl` outside an explicit allowlist that shrinks to empty by Phase 8.
2. **System lab.** The existing private `/admin/design-system` page is rebuilt into the single reference: tokens, type, glass tiers, every component × state × theme × density × surface, archetype templates, and a **Motion lab** that plays every registry effect with a speed control and a reduced-motion toggle. Its Playwright snapshots are the fastest consistency regression target.
3. **Cross-page consistency probe.** `tests/e2e/consistency.spec.ts` visits every public and console route and compares computed styles (header height, H1 family, size and weight, container width and gutters, section padding, `CtaBand` presence and position, footer) against `docs/design-system/archetypes.json`. Drift fails the build.
4. **Docs as contract.** `docs/design-system/{tokens,archetypes,components,motion}.md` change in the same PR as any system change.
5. **Review gate.** The Appendix D checklist applies to every PR that touches UI.
6. **Ownership.** Templates live in `src/components/templates/`. Pages compose templates and sections; engine-dependent components live in `components/motion` and `components/three`, never in `components/ui`.

### 3.16 Mobile, touch and print

Most first visits are on a phone, and a phone is where smoothness is hardest. Mobile is designed, not derived.

| Topic                  | Decision                                                                                                                                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scrolling              | Native scrolling only: no Lenis on touch, no scroll-jacking. Pinned scenes become stacked sections that animate in view. `overscroll-behavior` is contained in sheets; `100svh`/`dvh` and safe-area insets are used everywhere.         |
| Thumb zone             | After the hero, a slim sticky bottom bar offers the primary action ("Start a project") and the ⌘K search button; it hides while typing, in forms and in the footer. The nav sheet puts the CTA and contact line at the bottom.         |
| Targets and feedback   | 44 px minimum targets, 8 px spacing, `touch-action: manipulation`, pressed state within 50 ms. No hover-only information anywhere.                                                                                                |
| Touch motion           | Reveal, wipe, path draw and counters stay (they are cheap); pointer effects (tilt, magnetic, reticle, parallax-on-pointer) do not exist. Optional device-orientation parallax is **not** used (permission prompts and motion sickness). |
| Data and battery       | `Save-Data`, low memory or low battery moves the visitor to T1. Images use responsive `sizes`; the poster is the only hero asset on T1.                                                                                            |
| Forms                  | Correct `inputmode`, `autocomplete` and `enterkeyhint`; the label stays visible; the submit button is never hidden by the keyboard (visual viewport).                                                                            |
| Orientation and zoom   | Layouts hold at 200 % and 400 % zoom and in landscape; text never relies on viewport units alone (always `clamp` with a rem floor).                                                                                              |
| Print                  | `@media print` renders the paper theme: chrome, canvas, rail and motion removed; case files, articles and legal pages print with the system path as the header and URLs shown after links. A case file is meant to be printable as a one-page brief. |

---

## 4. Section-by-section blueprint

Legend: **Job** (what the section must achieve) · **Layout** · **Copy intent** · **Motion** (effect IDs from Appendix A, with meaning) · **3D / parallax** · **Fallback / reduced** · **Source** (Page kind and layout).

### 4.0 Global shell

| Element           | Spec                                                                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header            | Glass-1 bar, hairline bottom edge. Hides after a fast scroll down and returns on upward intent (M35); one indicator slides between nav items (M28). Left: wordmark. Centre: nav. Right: `⌘K` hint, theme toggle (Dark / Light / System), CTA. Mobile: full-screen sheet (existing `useDialogFocus`), large type, same focus trap rules. |
| Trace rail        | Desktop ≥ 1280 px: fixed left rail, vertical hairline with 8 labelled ticks (`/ingress /triage /stack /pipeline /files /process /trust /engage`; sub-chapters belong to the nearest tick). A pulse travels with scroll progress (M06). Ticks are anchor links. Mobile/tablet: 2 px top progress line plus the current chapter label in the header. Inner pages: hidden. |
| Footer            | Page tone, directly below the CTA band's inversion. Cropped giant wordmark (step-6) in `--mono-800`, scrubbed in by scroll (M22). Links from `Site.navigation.footer`, contact line, legal links, availability only when confirmed (C-05).                                                                              |
| Command palette   | ⌘K / Ctrl+K and a visible button. Glass-3 dialog. Commands: go to any route or chapter, open a case file, start a project (focuses contact form), copy email (if public), toggle theme, toggle motion and 3D. Custom combobox pattern (`role=dialog`, `combobox`, `listbox`, `aria-activedescendant`), no new library. |
| Cursor            | Fine pointer only, native cursor kept. A small reticle ring follows with lag and locks onto interactive elements (M16). Hidden in forms and on touch.                                                                                                                   |
| Page transitions  | Shutter wipe (M18) via View Transitions where supported, otherwise a CSS crossfade; entering page runs its master timeline. Theme toggle uses a circular reveal (M21).                                                                                                    |
| Links and buttons | Links draw their underline (M26). Primary buttons are an ink/paper inversion with a label roll on hover, 50 ms press feedback and a width-stable loading state (M27). Magnetic pull only on the hero and final CTA (M14). |
| Forms and feedback | Fields lift the label and draw the focus line (M32); errors name what failed and how to fix it, and flash the border once; success draws a check. Loading uses skeletons that match the final layout (M33). |
| Grain, vignette   | Fixed layers, static, no blend mode.                                                                                                                                                                                                                                      |

### 4.1 Home, chapter by chapter

The homepage section list keeps the closed Page kinds where possible and adds six (three at launch, three optional; section 5). Chapter labels are the anchor IDs.

**Tiers.** Tier 1 ships at launch. Tier 2 sections are built in Phase 5 but stay `visible: false` in the Page draft until their copy is confirmed, so you can switch them on from the admin without a deploy. A section with no publishable data hides itself.

| Chapter                              | Tier            | Tone  | Est. screens (desktop) |
| ------------------------------------ | --------------- | ----- | ---------------------- |
| 0 Hero                               | 1               | ink   | 1.0                    |
| 0b Evidence strip                    | 1, conditional  | ink   | 0.3                    |
| 1 Triage                             | 1               | ink   | 1.6                    |
| 2 Stack (pinned)                     | 1               | ink   | 2.5                    |
| 3 Pipeline (pinned)                  | 1               | ink   | 3.0                    |
| 4 Case files                         | 1               | ink   | 1.0                    |
| 4b Deliverables you can inspect      | 1               | ink   | 1.2                    |
| 5 Process and 5b Engagement          | 1               | paper | 2.2                    |
| 5c Fit check                         | 2               | paper | 0.7                    |
| 5d Starting-point finder             | 2, optional     | paper | 0.8                    |
| 6 Capability stack                   | 1               | ink   | 0.8                    |
| 7 Commitments, trust, GitHub         | 1               | ink   | 1.0                    |
| 7a How I think                       | 2               | ink   | 0.9                    |
| 7b Field notes                       | 1               | ink   | 0.6                    |
| 8 FAQ                                | 1               | ink   | 1.0                    |
| 9 Next steps and CTA                 | 1               | paper | 1.3                    |
| Footer                               | 1               | ink   | 0.6                    |

**Home length budget.** Tier 1 is about 18 screens of scroll at 1440×900 including the two pins (about 12.6 of content); Tier 2 adds about 2.4. The harness measures document height and Phase 5 fails if Tier 1 exceeds 19 screens or Tier 1 plus Tier 2 exceeds 22. If it feels long, hide chapters rather than shrink them.

#### Ch.0 `/ingress` — Hero (`site-hero`, new layout `topology`)

- **Job:** in five seconds say who this is, what problem they remove, and why it is credible. Make the visitor feel "systems and automation".
- **Layout:** full viewport (`100svh`). Hairline blueprint grid with registration crosses. Left: mono eyebrow built from the three role labels (data-driven), the H1, one sentence, CTAs. Right and bleeding behind: the 3D maquette. Bottom-right: one glass-2 info panel for the selected zone. Bottom-left: scroll cue as a mono label, not an arrow icon.

```
┌────────────────────────────────────────────────────────────────────┐
│ ▌wordmark   Solutions Work Process Lab About     ⌘K  ◐  [Start a project] │
├────────────────────────────────────────────────────────────────────┤
│ ┃ SYSTEM ARCHITECT / SOFTWARE DEVELOPER / AI AUTOMATION DEVELOPER    │
│ ┃                                      ╔═══ 3D maquette ═══╗       │
│ ┃ BUSINESS PROBLEMS IN.                ║  ▪──┐  ▪──▪        ║       │
│ ┃ RELIABLE SYSTEMS OUT.                ║     └──▪══▪ ← pulse║       │
│ ┃                                      ║  ▪──────┘   ▪      ║       │
│ ┃ one-sentence promise                 ╚═══════════════════╝       │
│ ┃ [Describe your problem →]  How I work ↓        ┌ glass panel ┐   │
│ ┃ ─ ─ ─ ─ hairline grid + ticks ─ ─ ─ ─ ─ ─ ─    │ zone: AI    │   │
│ ┃ ingress                                        └─────────────┘   │
└────────────────────────────────────────────────────────────────────┘
 ┃ = trace rail
```

- **Copy intent:** the H1 states the outcome in the client's words; the sentence names the three roles' jobs; secondary CTA scrolls to Process. See 5.4 for options A to C (D-01).
- **Motion:** M01 grid draws in (Assemble), M02 headline lines settle (Resolve), M03 poster to canvas crossfade (Assemble), M04 camera dolly with scroll (Transmit), M05 pointer depth on camera and layers (Respond), M16 reticle, M23 scroll velocity drives the pulse speed (Transmit).
- **Entrance timeline** (server HTML is already complete and visible at first paint; nothing here gates content, and the canvas crossfade simply waits if the 3D chunk is late):

| Time (ms) | Event                                                                                      |
| --------- | ------------------------------------------------------------------------------------------ |
| 0         | First paint: headline, sentence, CTAs and the poster are all visible                       |
| 0 to 300  | M01 hairline grid and registration crosses draw in behind the content                      |
| 150 to 450 | Mono eyebrow decodes (M09)                                                                |
| 200 to 800 | H1 lines settle from a 4 % mask offset and 3 % width difference (M02), no opacity start   |
| 500 to 1000 | After hydration and idle: poster crossfades to the live canvas (M03); pulse starts       |
| 700 to 1100 | Glass info panel and CTAs settle (M07); total ≤ 1.4 s                                    |
- **3D / parallax:** the maquette (3.8). DOM parallax layers by depth: grid 0.05, canvas (camera-driven), ghosted index text 0.15, content 1.0, foreground ticks 1.1. Meaning: back layers move less, like infrastructure behind an interface.
- **Fallback / reduced:** T0/T1 show the poster with two CSS parallax layers on pointer (T1 only, fine pointer, motion allowed); reduced shows the poster, static. No-JS shows the full hero text and poster. The role-label zone switcher works without WebGL (it changes the info panel and highlights the poster region).
- **Replaces:** the custom five-slide autoplay hero (no autoplay, so the autoplay accessibility obligations disappear from the hero). `useAutoplayController` and `lib/motion/autoplay.ts` stay only if another consumer remains; otherwise they are removed with their tests in Phase 3.

#### Ch.0b Evidence strip (`metrics-strip`, new layout `evidence`)

- **Job:** give honest, checkable proof inside the first scroll, on a site that has no client logos.
- **Layout:** one hairline-bordered row directly under the hero, at most four cells. Each cell holds a Mono tabular number, a one-line label, a verification mark (`Derived from code` or `Verified`) and a link to the case file the number comes from. A focusable "how this was measured" note opens in a small glass-2 popover.
- **Rules:** only `verified` or `derived` metrics render; the strip disappears entirely if fewer than three qualify. Every derived value carries `as_of` (the release date) and is re-derived in the release checklist; a value older than 180 days is hidden until re-derived (policy C-30).
- **Motion:** M10 digit roll once in view; M26 on links. Nothing loops. **Reduced:** final numbers, no roll.
- **Source:** `Site.metrics` (existing; gains `source_slug` and `as_of`), Page kind `metrics-strip`, layout `evidence`.

#### Ch.1 `/triage` — Problems (new kind `problem-index`)

- **Job:** let the visitor recognise their own situation and see the way out. This is the "problems I solve" heart of the repositioning.
- **Layout:** two columns on desktop. Left (sticky): a short list of problem groups (Systems, AI Automation) with a mono count. Right: a typographic index. Each row is one pain sentence set large (step-3, Display wide). Selecting a row (click, Enter, or in-view on mobile) expands it inline into Approach, Deliverable and Outcome (Problem → Approach → Deliverable → Outcome as four mono-labelled lines), plus "Related case file" when one exists.

```
 Systems ─────────────  │  OUR SOFTWARE KEEPS BREAKING AS WE GROW        ＋
 AI Automation          │  WE HAVE AN IDEA THAT NEEDS TO BECOME A PRODUCT ＋
                        │  MY TEAM LOSES HOURS TO REPETITIVE STEPS        －
                        │   Approach     Find the manual steps, automate…
                        │   Deliverable  Workflow in production, runbook
                        │   Outcome      Fewer manual steps and errors you can measure
                        │   [Describe this problem →]  case file: …
```

- **Interaction that earns conversions:** "Describe this problem" links to `/contact?topic=<problem_key>`. The form shows the topic as a removable chip and pre-fills a subject line. No API change (client-side prefill only).
- **Motion:** M07 rows rise in a stagger (Resolve); M13 expand on selection with a pulse drawn from row to panel (Transmit); M09 mono labels decode.
- **Parallax:** a huge ghosted role glyph in the texture of the active area drifts at 0.15.
- **Fallback / reduced:** semantic `<details>`-style disclosure; all details visible when motion is off; keyboard: arrow keys move between rows, Enter toggles.
- **Source:** new kind `problem-index`, data derived from `Service.problems[]`.

#### Ch.2 `/stack` — Solutions as a stack (`service-collection`, new layout `stack`)

- **Job:** show the three offers as layers of one system, and that the client can take one layer or all.
- **Layout (desktop):** pinned scene, about 250 vh. Three glass-2 slabs begin stacked tight in perspective (foundation at the bottom: Architecture & System Design; middle: Product & Software Development; top: AI & Workflow Automation, which is also the true order of a real system). Scrolling separates them (exploded view). As each separates, hairline leader lines in mono point to its specs: outcome, capabilities, deliverables, technologies.

```
                 ┌───────────────────────────┐ AI & Workflow Automation
              ─ ─│  outcome · capabilities   │─ ─ → deliverables
            ┌────┴───────────────────────────┴────┐ Product & Software Development
         ─ ─│  outcome · capabilities             │─ ─ → deliverables
       ┌────┴─────────────────────────────────────┴────┐ Architecture & System Design
    ─ ─│  outcome · capabilities                       │─ ─ → deliverables
       └───────────────────────────────────────────────┘
```

- **Motion:** M11 stack explode (Assemble), scrubbed with `scrub.lag`; M15 sheen follows the pointer across the active slab (Respond); the section enters through the tone-band boundary wipe when its tone differs from the previous chapter (M24).
- **Parallax:** each slab is on its own depth (translateZ); camera tilt 8° max on pointer.
- **Mobile:** no pin. Slabs stack vertically and open one by one in view.
- **Reduced:** three plain panels in reading order with all specs visible.
- **Source:** `service-collection`, layout `stack` (additive).

#### Ch.3 `/pipeline` — Automation, step by step (`architecture-workflow`, new layout `pipeline`)

- **Job:** prove judgement on AI automation by showing the guardrails, not the hype. Labelled **illustrative, not a client project**.
- **Layout:** pinned scene about 300 vh. A horizontal path of five nodes in glass chips: **Input** → **Automation** → **AI agent** → **Review gate** → **Output**. A light pulse travels the path with scroll. At each node a panel states what it does and what happens when it fails (retry, alert, safe fallback). The last frame states the switch-off.

```
 [Input] ───▶ [Automation] ───▶ [AI agent] ───▶ [Review gate] ───▶ [Output]
   │              │                 │               │                 │
 request      route/enrich      classify/draft   a person approves   lands where the
 arrives       with rules       within limits    anything risky      team already works
                              when it fails: retry · alert · fallback · one switch to turn it off
```

- **Motion:** M12 pipeline trace (Transmit): SVG `stroke-dashoffset` scrubbed with scroll with the shared tapered pulse head (M31), node highlight at each step, pulse speed following scroll velocity (M23). Pure SVG/DOM, no second WebGL canvas.
- **Reduced:** static diagram with all labels and the failure line visible.
- **Source:** `architecture-workflow`, layout `pipeline`; data `Site.workflow_example` (section 5).

#### Ch.4 `/files` — Case files (`case-study-collection`, new layout `files`)

- **Job:** evidence that reads as engineering, not a logo wall.
- **Layout:** a dense list of "case files", not rounded cards. Each row: title, engagement type chip (`Client engagement`, `Internal product`, `Open source`, `Lab experiment`, from the existing contract so an internal product is never presented as client work), one-line problem, primary role, one derived outcome. Hover or focus floats a greyscale preview (glass) beside the row. Rows link to the detail walkthrough (4.2).
- **Motion:** M07 rise; M08 media wipe on preview; M26 underline draw on titles; M16 reticle label "open"; on click the row thumbnail morphs into the case-file hero (M30).
- **Empty/fallback:** if no published case files exist, show the platform case file ("How this site was built") which is real and derived.

#### Ch.4b `/files` Deliverables you can inspect (`deliverable-samples`, new)

- **Job:** answer "what will I actually get?" with real artifacts instead of adjectives, and let a technical reviewer judge rigour in thirty seconds.
- **Layout:** a document viewer. Left: a tab list (Decision record · Architecture diagram · Runbook · Test report · Migration dry run). Right: the selected sample set as a printed page in Mono with page-edge hairlines, a header bar (type, version, date) and a footer naming the source ("From this site's own repository"). Excerpts are plain text or code-native SVG, never screenshots. Mobile: accordion.
- **Rules:** only artifacts from real work that is safe to publish. This repository's ADRs, seeding runbook and migration dry-run output are the starting set. No secrets, hosts or personal data; each sample is approved individually (C-31) and redacted at the source, not hidden with CSS.
- **Motion:** tab switch is a 150 ms crossfade; the first open decodes the header line (M09). The page-enter preset covers the rest. **Reduced:** all samples stack in reading order.
- **Source:** new Page kind `deliverable-samples`; data `Site.deliverable_samples`.

#### Ch.5 `/process` — How I work (`process-steps`, layout `numbered` restyled as `wire`)

- **Job:** lower perceived risk by making the engagement predictable.
- **Layout:** paper-tone band. A vertical wire with the six existing steps (order is real, so numbering is justified): title, summary, deliverable. Followed by the **Engagement** table (new kind `engagement-models`, 4.1b).
- **Motion:** the paper band enters through the boundary wipe (M24); M19 wire draws as you scroll with the shared pulse head (M31); the active step darkens, others dim to `--text-secondary`.
- **Reduced:** static list.
- **Source:** existing `Site.process`.

#### Ch.5b Engagement (`engagement-models`, new)

- **Layout:** a spec-sheet table, not three equal cards. Columns: Model · Best when · You get · How it runs · Starting point. Rows are collapsible on mobile into stacked definition lists. Segment lines under the table: "This is for you if…" (founders, operators, agencies, internal teams).
- **Data rules:** durations and prices render only if `verification` is `verified`; otherwise the cell says "Scoped per project" (never an invented number).

#### Ch.5c Fit check (`fit-check`, new, tier 2)

- **Job:** pre-qualify honestly. Saying who the work is not for is a trust signal and cuts bad-fit enquiries.
- **Layout:** two columns split by a hairline. "A good fit if" lists the four segments, one line each (this replaces the "this is for you if" lines under the engagement table, so the wording lives in one place). "Probably not a fit if" lists two or three plain lines. No icons; Mono column headings.
- **Motion:** M07 only. **Reduced:** identical.
- **Source:** `Site.fit` (segments and not-a-fit lines), Page kind `fit-check`. The stances need your approval (C-32).

#### Ch.5d Starting-point finder (`starting-point`, new, tier 2, optional)

- **Job:** turn "I am not sure what I need" into a concrete next step, and show judgement while doing it.
- **Layout:** an inline three-question form (not a modal) in a glass-2 panel: the situation (the Triage groups), where you are now (an idea, working but painful, running and growing), and what matters most (speed, reliability, cost). The result card names the engagement model that fits, gives the reasoning in one sentence, and offers "Describe it" linking to `/contact?topic=…&start=…`. It is labelled **A suggestion, not a quote.**
- **Privacy:** computed entirely in the browser from `Site.finder` rules. Nothing is sent or stored. The privacy-safe event `finder_complete(outcome_key)` carries the outcome key only.
- **A11y:** real radio groups, an `aria-live` result, fully keyboard operable, no motion needed. **Reduced:** identical.
- **Source:** `Site.finder` (steps and outcome rules), Page kind `starting-point`. Ships only after the engagement models are confirmed (C-13).

#### Ch.6 Capability stack (`skill-group-collection`, new layout `registry`)

- **Job:** the supporting layer. Demoted from headline to reference, per your brief.
- **Layout:** a compact mono grid with hairlines, grouped by role, each skill a one-line entry. Technology tags link to case files that use them where the data exists.
- **Motion:** M09 decode on first view only. Nothing else.

#### Ch.7 Trust and commitments (`commitments`, new; plus `metrics-strip`, `testimonial-collection`, `github-profile`)

- **Job:** trust without fabricating proof.
- **Content:** "How I keep projects safe" commitments (small reviewable releases, decisions written down, tests on critical paths, security built in, handover documentation), each as a plain line with a glyph. Metrics, testimonials and credentials render only when verified. GitHub profile and the contribution calendar render in the grey ramp ("See how I build, in the open").
- **Reduced:** identical content, no motion.

#### Ch.7a How I think (`commitments`, layout `principles`, tier 2)

- **Job:** show judgement in five lines, the cheapest honest way to demonstrate "how smart" without claiming it.
- **Layout:** five large Display statements stacked with hairlines, each with a one-line elaboration in Text. The same lines feed About (one source, `Site.principles`).
- **Motion:** M02 line settle, one statement at a time as it enters. **Reduced:** static. **Copy:** your approval, C-18.

#### Ch.7b Field notes (`article-collection`, new layout `notes`, `item_limit` 3)

- **Job:** keep the Lab discoverable and add engineering-judgement proof, without letting projects, articles and videos compete with the case files. The home page keeps the three latest featured articles, each with its one-line takeaway, plus "Open the lab" to `/projects`, where projects and videos are one click away through the `LabSwitcher`.
- **Layout:** three hairline rows: Display title, the article's excerpt as the takeaway, and Mono metadata (reading time, topic). The seeded articles are real lessons from this repository (for example, a query that only failed on the real server), which is exactly the point.
- **Motion:** M07 and M26 only. **Reduced:** identical.
- **Source:** the existing `article-collection` kind with the new layout `notes` and `item_limit: 3`. The old home sections `project-collection`, both `video-collection` rows and `article-collection:featured` are removed from the home draft in seed v8; their routes and pages are unchanged.

#### Ch.8 Objections (`faq-list`, layout `accordion`)

- **Layout:** two-column on desktop (question list left, answer right), accordion on mobile. Categories `engagement`, `process`, `technical`. Rewritten around objections (5.4). JSON-LD `FAQPage` generated from the same data.

#### Ch.9 `/engage` — Next steps and egress (`contact-cta`, layout `banner`, paper band)

- **Layout:** above the statement, a short Mono list of **what happens after you write** (a real sequence, so numbered): 1 you describe the problem; 2 I reply with whether I can help and what I would need to know; 3 if it fits, we agree a first small step. Times appear only if confirmed (C-04). Below it, one huge statement (step-6), the email (if public), a magnetic primary button and the ⌘K hint. The footer wordmark crop sits directly beneath. The same `Site.next_steps` data drives "What happens next" on the Contact page, so the promise is worded once.
- **Motion:** M14 magnetic CTA with label roll (M27), M02 line reveal, M22 wordmark scrub into the footer.

### 4.2 Inner pages

All inner pages are built from the archetype templates in 3.12 and 3.13: identical shell, `PageHeader` anatomy, page-enter preset, rhythm and `CtaBand`. The table describes only what is specific to each page.

| Page                  | Blueprint                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/case-studies`       | Index as the Ch.4 "case files" list with filters by role and engagement type (existing URL-backed discovery). Page header uses a smaller topology fragment (static SVG), not WebGL.                                                                                                                                                                                                                                                   |
| `/case-studies/[id]`  | **Scrollytelling walkthrough: Problem → Constraints → Architecture → Result.** Left: sticky architecture diagram (code-native SVG built from structured data, monochrome, `<title>`/`<desc>` plus a text list equivalent). Right: four chapters. As each chapter scrolls, the diagram highlights the relevant nodes and edges (M17). Result chapter shows outcomes with verification marks; numeric verified or derived values count up (M10). Footer: next case file and the CTA. Mobile: diagram becomes an inline figure per chapter. |
| `/projects`           | "Lab" registry: dense table (name, role, stack, type), row preview on hover/focus, `LabSwitcher` to Articles/Videos. Project detail keeps its current structure with new tokens and the same four-word vocabulary.                                                                                                                                                                                                                      |
| `/articles`           | Editorial layout: wide measure for reading, Display H1, Mono metadata (reading time, topics), reading-progress hairline. Long-form uses the existing sanitized `editorial` styles, retuned to the type scale.                                                                                                                                                                                                                         |
| `/videos`             | Greyscale posters, mono duration chips; player frame is a hairline box; reels remain a vertical grid. Embedded players get the same `grayscale` rule. The seeded videos are curated third-party links, so the page and the home chapter are headed **Recommended watching** and kept out of the home hero path unless C-29 says they are yours.                                                                                       |
| `/about`              | "Who is solving your problem." Mono-treated portrait (parallax mask reveal), the long positioning, **How I think** (principles, owner-approved, C-18), timeline with wire draw (M19), credentials and courses (existing, truth-gated), capability stack link, CTA. Not a CV dump.                                                                                                                                                          |
| `/contact`            | Ink panel with a glass form. Topic chips (Systems / AI Automation / Something else) prefilled from `?topic=`. Left column: "What happens next", the same `Site.next_steps` data as the home page (no invented response time, C-04). Email shown if public (C-03). Existing validation, honeypot, rate-limit and receipt behaviour untouched. The Google Map is replaced or removed (C-06). Optional (tier 2): a working-hours bar that shows the visitor's local time against the published hours, computed in the browser (C-33).                                                                         |
| `/privacy`, `/terms`  | Typography only. Quiet. Same shell; motion is the page-enter preset and the reading-progress hairline (M34).                                                                                                                                                                                                                                                                                                                                                                           |
| 404, error, loading   | In brand: 404 shows the maquette as a static still with a mono "no route" path and a search via ⌘K. Loading uses a hairline progress bar, not spinners on a coloured disc.                                                                                                                                                                                                                                                              |

### 4.3 Console (admin) blueprint

**Principles:** decide first, calm, dense but legible, keyboard first, never surprising. Workspace **behaviour** is unchanged; presentation, structure and feedback improve.

#### Shell (`AdminShell`)

| Element         | Spec                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rail            | 240 px expanded, 56 px collapsed, hairline right edge, solid surface. Groups stay (Overview, Experience, Content, Inbox, System) and are filtered by capability as today. Active item = ink block with paper text and a 2 px left bar (shape and weight, not colour); hover = `--line-1` fill. Collapse follows C06.                                      |
| Top bar         | Solid (no blur), 48 px. Breadcrumb as a system path (`/admin/case-studies/edit`), environment chip (Production, Preview, Development, with a distinct shape for production), **publish-state chip** ("Published r12, draft r13: review and publish"), `⌘K`, theme toggle, "View site", user menu (profile, sign out).                                |
| Command palette | `⌘K` opens the same component as the public palette with a console command set: jump to any workspace (capability-filtered), search records by title (debounced, existing list endpoints), create (New article, New project…), "Review and publish site", toggle theme, sign out.                                                                |
| Session         | Existing refresh timer and cross-tab sign-out unchanged. If a refresh fails, a quiet banner appears 2 minutes before expiry; the user is never redirected away from a dirty form without warning.                                                                                                                                                       |
| Mobile          | The rail becomes a sheet (existing dialog focus trap); the top bar keeps ⌘K as a search button.                                                                                                                                                                                                                                                         |

#### Dashboard (C1 Overview)

Replaces the "Portfolio operations at a glance" hero card. Order is by decision value.

```
 Status line: Production · Site published r12, draft r13 (3 unpublished changes → Review and publish) · refreshed 10:42
 ┌ Needs attention (3) ──────────────────────────────────┐  ┌ Inbox ────────────────────────┐
 │ ◆ 3 incomplete case files          Open filtered →     │  │ 2 new · 1 qualified            │
 │ ◆ 1 email in dead letter           Open outbox →       │  │ latest: AI Automation, 2h ago  │
 │ ◇ 2 drafts untouched for 30 days   Open filtered →     │  │ [Open inbox →]                 │
 └────────────────────────────────────────────────────────┘  └────────────────────────────────┘
 ┌ Publishing pipeline ───────────────────────────────────────────────────────────────────────┐
 │ Case studies  ▒▒▒░░░████████   2 draft · 1 pending · 4 published                              │
 │ Articles · Projects · Videos  (same row; pattern fills, direct labels, no colour legend)      │
 └────────────────────────────────────────────────────────────────────────────────────────────┘
 ┌ Enquiries, last 30 days (optional) ┐  ┌ Recent activity ───────────┐  ┌ System ───────────────────┐
 │ started → sent, by topic            │  │ last 8 audit events         │  │ outbox · media · migrations │
 └─────────────────────────────────────┘  └─────────────────────────────┘  └───────────────────────────┘
```

- **Needs attention** is the first block: a prioritised list with a severity mark (◆ high, ◇ medium), the measured fact, and one deep link that opens the target workspace *with the filter already applied* (workspaces already keep filters in the URL). Zero state: "Nothing needs attention" plus the last-checked time. It replaces the coloured banner.
- **Publish state** is first-class because publishing is the most consequential action. The status line links to a "Review and publish" view that lists the changed fields between the draft and the published snapshot (both are already in the admin Site DTO, so this needs no new API) and offers the existing publish action.
- **Numbers** are Mono, tabular and exact; no count-up, no icon tiles, no blurred blob, no gradient, no `rounded-3xl`.
- **Charts** use pattern fills (solid, hatch, dots, outline) with direct labels. Colour is never the encoding.
- **Enquiries panel (optional, decided in Phase 7, D-08):** contact started → sent, by topic, from the privacy-safe events in 2.3. Needs C-28 and a check that the observability endpoint stores events **[VERIFY]**. If events are not stored the panel is cut, not faked (the dashboard already promises "no placeholder statistics").
- **Refresh:** `router.refresh()` when the tab regains focus after 60 s, plus a manual button; the "refreshed at" label changes without layout shift.

#### Workspace patterns

| Archetype              | Pattern                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C2 Workspace list      | Page header (title, one-line description, primary action). Toolbar: search, status chips, sort, density toggle, column visibility where it exists. `DataTable` with sticky header, row hover and selection, keyboard navigation, URL-backed filters and pagination (existing). Selecting rows reveals a bulk bar. States: skeleton rows at the real row height; empty (what this is plus the action); filtered-empty (clear filters); error (what failed plus retry). |
| C3 Editor              | Header with record title, **status mark**, revision and last saved. At 1280 px and up, a left section index with scroll-spy and per-section dirty and error marks (a sticky select below that). Sections separated by hairlines, not cards. **Sticky action bar:** Discard · Save draft · Preview · Publish, showing "3 unsaved changes". Validation summary at the top with jump links. ⌘S saves. Unsaved-changes guard on tab close and in-app links **[VERIFY App Router interception in Phase 7]**. The existing preview runtime opens as a side panel. |
| C4 Inbox               | Master-detail: list with state marks on the left, message on the right; `j`/`k` move, `e` changes state with an undo toast. On mobile the detail replaces the list.                                                                                                                                                                                                                   |
| C5 Settings            | Single column, grouped sections, same field patterns.                                                                                                                                                                                                                                                                                                                                 |
| C6 Auth                | Sign-in, forgot and reset keep their flows (MFA, recovery). Visuals: a centred glass-3 form over the static maquette still with grain; no WebGL. Errors use the shared error pattern with `aria-live`.                                                                                                                                                                                 |

#### Status marks (replace coloured badges)

`StatusBadge` keeps its `tone` API so every caller compiles unchanged, but renders a mark with a visible text label:

| Tone        | Mark                                  | Examples                  |
| ----------- | ------------------------------------- | ------------------------- |
| neutral     | outlined square                       | Draft                     |
| primary     | filled square                         | Published, Active         |
| info        | half-filled square                    | Pending, Scheduled        |
| success     | square with a check                   | Verified, Sent            |
| warning     | outlined diamond, heavier label       | Needs attention, Stale    |
| destructive | filled triangle, inverted label       | Error, Dead letter        |

The shape keeps state legible in greyscale, in print and for colour-blind users.

#### Console quality bar

- Every list and editor loads a skeleton with the final layout's dimensions.
- Local interactions (filter, select, toggle) respond within 100 ms. Mutations show pending state immediately and confirm with a toast that names the result ("Published", not "Success").
- Destructive actions use a dialog that names the record; irreversible ones require typing the name.
- Every action is reachable by keyboard, focus is always visible, and shortcuts are discoverable in the palette.
- No animation library loads in any `/admin` route (bundle boundary test).
- Existing authority, route-boundary and data-boundary tests stay green. Authenticated Playwright coverage is added, which also closes the open "authenticated admin browser acceptance" item in the ledger.

---

## 5. Content and data plan

### 5.1 Principles

1. **Repositioning rule.** Every block answers, in order: Problem → Approach → Deliverable → Outcome. Skills appear only as supporting tags.
2. **Decoupling.** Components receive DTOs. Copy lives in the seed manifest and the CMS, never in components. Emergency fallbacks derive from the same seed constants, not copies.
3. **Truth gates.** Each new factual field has a `verification` of `unverified | derived | verified` (the existing convention) and a claim ID registered in `docs/content/content-truth.v1.json` (minor version bump). Public readers drop anything not `verified` or `derived`. Unknown values are `[CONFIRM:ID]` in this plan and `enabled:false` / `unverified` in data.
4. **Draft status.** Everything below is draft copy in the owner's voice, pending approval (C-18). Seed stays `noindex` until the launch gate.

### 5.2 Data model changes (all additive and optional; no key renames; no route changes)

| Entity                         | Change                                                                                                                                                                                                                                                                                   | Notes                                                                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Site** (draft + published)   | `positioning.headline?: string` (≤ 90). `engagement_models: TSiteEngagementModel[]` (≤ 4). `commitments: TSiteCommitment[]` (≤ 6). `workflow_example?: TSiteWorkflowExample`. `experience.theme` seed default `system` → `dark`.                                                               | Mirrors the existing embedded `process[]`. Default `[]`. Snapshot limit 256 KB is ample. Zod schema is `strict`, so the schema, Mongoose model, DTO builder and admin form change together. |
| **Site, home additions** (all optional, default `[]`) | `deliverable_samples` (≤ 6; plain-text excerpt ≤ 1,200 chars), `next_steps` (≤ 4, ordered), and `metrics[]` gains `source_slug?` and `as_of?`. Tier 2: `fit { segments[], not_a_fit[] }`, `principles` (≤ 6), `finder { steps[], outcomes[] }`, `contact.working_hours?`. | Same pattern as `process[]`; every list is capped so the snapshot stays far below 256 KB. Excerpts are plain text and escaped at render (no HTML, consistent with the sanitiser policy). `finder` rules are evaluated in the browser. |
| **Site.pillars[].accent**      | **Kept, inert.** Renderer ignores the hue and selects a texture from `icon_key`/`fallback_visual_key` (`system-blueprint` → grid, `full-stack-layers` → lines, `automation-node` → dots).                                                                                                | Avoids breaking the contract and stored snapshots. `PILLAR_ACCENTS` stays valid.                                                                                                       |
| **Service**                    | `problems: { key, pain, approach, deliverable?, outcome?, case_slug? }[]` (≤ 5). Existing `outcome`, `capabilities`, `deliverables`, `technologies` stay.                                                                                                                                | Triage rows derive from here. One record per offer keeps editing simple.                                                                                                               |
| **CaseStudy**                  | `constraints: string[]` (≤ 6). `architecture?: { alt, layers[], nodes[{key,label,layer,kind,note?}], edges[{from,to,label?}], steps[{title,focus[]}] }`. Publish readiness adds "constraints" and "architecture" as recommended (not blocking) until existing records are updated.      | Today the model has `challenge`, `approach`, `solution`, `outcomes` but no constraints and no diagram. Diagram data is validated by Zod and rendered as code-native SVG (uploaded SVG stays rejected). |
| **Project**                    | None (already has `constraints`).                                                                                                                                                                                                                                                        |                                                                                                                                                                                        |
| **FAQ**                        | None. Objections use existing categories (`engagement`, `process`, `technical`).                                                                                                                                                                                                         |                                                                                                                                                                                        |
| **Page**                       | New kinds (6): `problem-index`, `engagement-models`, `commitments` and, from the home additions, `deliverable-samples`, `fit-check`, `starting-point`. New layouts on existing kinds: `site-hero:topology`, `service-collection:stack`, `architecture-workflow:pipeline`, `case-study-collection:files`, `skill-group-collection:registry`, `process-steps:wire`, `metrics-strip:evidence`, `commitments:principles`, `article-collection:notes`. `PAGE_ROUTE_SECTION_KINDS` and `PublicPageSections` updated. | Adding enum values is backward compatible with published snapshots. Home draft composition updated in seed v8.                                                                          |
| **Seeds**                      | `FOUNDATION_SEED_VERSION` 7 → 8 (mandatory: the checksum guard fails otherwise). Launch content gains `constraints` and `architecture` for the four launch case studies.                                                                                                                  | Re-apply with `pnpm seed` in a non-production database first. Production needs the existing confirmation phrase.                                                                       |
| **Migrations**                 | Verify whether collection validators or indexes constrain these documents. If so, add an idempotent migration (next number in the registry) that backfills empty arrays. If not, reader defaults are enough. **[VERIFY in Phase 4]**                                                       | Production has no published content yet, so risk is low.                                                                                                                               |
| **Admin**                      | Site workspace gains editors for `engagement_models`, `commitments`, `workflow_example`, `positioning.headline`. Service editor gains `problems`. Case study editor gains `constraints` and a validated JSON editor for `architecture` with live SVG preview.                              | Reuses the Process editor pattern from P11. Behaviour unchanged; visuals follow the console surface (Phases 7 and 8).                                                                  |

Proposed shapes:

```ts
type TSiteEngagementModel = {
  key: string; name: string;
  best_when: string; you_get: string[]; how_it_runs: string;
  duration_label?: string;  price_label?: string;      // shown only when verified
  verification: "unverified" | "derived" | "verified";
  enabled: boolean;
};
type TSiteCommitment = { key: string; title: string; summary: string; enabled: boolean };
type TSiteWorkflowExample = {
  title: string; caption: string; illustrative: true;
  nodes: { key: string; kind: "input" | "automation" | "agent" | "review" | "output";
           label: string; summary: string; on_failure?: string }[];
  switch_off?: string;
};
type TSiteDeliverableSample = {
  key: string; title: string;
  kind: "decision_record" | "diagram" | "runbook" | "report" | "dry_run";
  excerpt: string;                                    // plain text, <= 1200 chars
  source_label: string; source_slug?: string;
  verification: "unverified" | "derived" | "verified"; enabled: boolean;
};
type TSiteFit = { segments: { key: string; label: string; for_you_if: string }[]; not_a_fit: string[] };
type TSiteFinder = {
  steps: { key: string; question: string; options: { key: string; label: string; tags: string[] }[] }[];
  outcomes: { engagement_key: string; when_tags: string[]; reasoning: string }[];
};
```

### 5.3 Reuse map (nothing is thrown away)

| Existing content (seed v7)                                                  | Fate                                                                                                      |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Role headlines and summaries (`PILLAR_COPY`)                                | Kept as the info-panel and Stack copy. Light edits only.                                                  |
| Three services with outcome, capabilities, deliverables                     | Kept. Gain `problems[]`.                                                                                  |
| `positioning.compact/mobile/long/client_promise`                            | Kept. Hero subline uses `compact`. New `headline` added.                                                  |
| Process steps (6, with deliverables)                                        | Kept, restyled.                                                                                           |
| FAQs (6)                                                                    | Kept where good; 4 to 5 added or rewritten as objections (5.4).                                           |
| Skill groups (3) and 15 skills                                              | Kept as the Capability stack. Technology claims to confirm (C-23).                                        |
| 4 launch case studies, 6 projects, 6 articles                               | Kept. Case studies gain constraints and diagrams. Labelled by their true engagement type (internal).      |
| 6 curated third-party videos                                                | Kept under Lab, re-headed as **Recommended watching** unless C-29 says they are yours. Out of the home hero path. |
| Generated colour hero candidates (P12)                                      | Retired. Not ingested. Poster is rendered from the 3D scene.                                              |

### 5.4 Rewritten copy deck (draft)

Status tags: ✔ reused from repo seed · ✎ new draft needing owner voice approval · `[CONFIRM:ID]` unknown fact. `{name}` = `identity.public_name` (C-01).

**Hero** (`site-hero`)

| Field          | Copy                                                                                                                                                                                                  | Status |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Eyebrow        | Built from role labels: `System Architect / Software Developer / AI Automation Developer`                                                                                                              | ✔ data |
| H1 **A** (rec.) | **Business problems in. Reliable systems out.**                                                                                                                                                       | ✎ D-01 |
| H1 B           | I design the system. Then I build it, and automate the rest.                                                                                                                                          | ✎ D-01 |
| H1 C           | Less manual work. Fewer fragile systems.                                                                                                                                                              | ✎ D-01 |
| Subline        | I turn business problems into clear architectures, working software and dependable automation.                                                                                                        | ✔ `positioning.compact` |
| Primary CTA    | Describe your problem                                                                                                                                                                                 | ✎      |
| Secondary CTA  | See how I work                                                                                                                                                                                        | ✎      |
| Microcopy      | Email or form. `[CONFIRM:C-04]` response time is shown only if you confirm one.                                                                                                                       | ✎      |

**Evidence strip** (`metrics-strip:evidence`): no heading, the row speaks. Cells are ✔ derived from the launch case studies and re-derived at each release (C-30): **15** schema migrations applied cleanly from an empty database · **860** automated tests passing · **None** redeploys needed to change public content. Each cell shows its verification mark and a "how this was measured" note.

**Triage** (`problem-index`): heading **What is slowing your business down?** · sub **Pick the sentence that sounds like your week.**

| Group         | Pain (row title)                                                                  | Approach                                                                           | Deliverable                                          | Outcome                                                                  |
| ------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Systems       | Our software keeps breaking as we grow.                                           | Map the failure points, redesign data and service boundaries, migrate in safe steps. | Architecture review, decision record, migration plan | A system that scales on purpose, with the risks written down.            |
| Systems       | We have an idea, or a spreadsheet, that needs to become a real product.            | Define the smallest useful version and build it end to end in reviewable releases.  | Working product, tests, handover documentation       | Something real in users' hands that your team can extend.                |
| Systems       | Nobody can tell us what this will cost to build or run.                           | Compare realistic options and costs; choose the simplest that works.               | Option comparison with cost and risk notes           | A decision you can defend.                                               |
| Systems       | Our internal tools are slow, manual or held together by spreadsheets.             | Replace the weakest workflow first with a small, tested internal tool.             | Admin panel or internal tool in production           | Staff stop working around the system.                                    |
| AI Automation | My team spends hours on repetitive, error-prone steps.                            | Find the manual steps and automate them with monitoring and a switch-off.          | Automated workflow in production, runbook            | Fewer manual steps and fewer errors, measured against a baseline we agree. |
| AI Automation | We tried AI and it works in a demo but not in the real workflow.                  | Add human review, logging and fallbacks so the output can be trusted.              | LLM-assisted feature with review gate and monitoring | AI that your team can trust, audit and turn off.                         |
| AI Automation | Our tools do not talk to each other.                                              | Connect them with reliable integrations and background jobs.                       | Integrations with failure alerts                     | Data moves once, correctly, without copy and paste.                      |

All ✎ (framings of problems, not factual claims). Outcomes avoid numbers on purpose. Numbers appear only when a verified case file supplies them.

**Stack** (`service-collection:stack`): heading **Three layers. Take one, or all.** · sub **Every system has the same three layers. I can own one of them or the whole stack.** Layer copy is the existing service `outcome`, `capabilities`, `deliverables` ✔.

**Pipeline** (`architecture-workflow:pipeline`): heading **Automation you can trust, one step at a time.** · caption **An illustrative flow, not a client project: how an inbound request becomes finished work without anyone copying and pasting.**

| Node        | Summary                                                              | If it fails                                  |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------- |
| Input       | A request arrives by email, form or webhook.                          | Kept in a queue, never dropped.              |
| Automation  | Rules clean it, route it and add the missing details.                 | Retries, then an alert to a named person.    |
| AI agent    | A model classifies it or drafts a reply, inside limits you set.       | Falls back to the manual path.               |
| Review gate | A person approves anything risky before it goes out.                  | Waits; nothing is sent without approval.     |
| Output      | The result lands where your team already works, with an audit trail.  | Logged and retried.                          |

Switch-off line: **One switch turns the whole thing off, and everything it did is logged.** All ✎, consistent with seeded commitments (monitoring, logging, safe fallbacks, human-in-the-loop).

**Case files** (`case-study-collection:files`): heading **Problems solved, start to finish** ✔ · sub **Every case file follows the same four steps: the problem, the constraints, the architecture and the result.** ✎ · empty state **No client case files are published yet. Read how this site itself was built.** ✎

**Deliverables** (`deliverable-samples`): heading **What you actually receive** · sub **Real artifacts from my own projects, not mock-ups.** Tabs: Decision record (an excerpt from an ADR in this repository) · Architecture diagram (a case-file diagram) · Runbook (the seeding guide) · Test report (test-suite summary) · Migration dry run (dry-run output). Every footer reads **From this site's own repository.** ✎ Excerpts are chosen and redacted in Phase 4 (C-31).

**Process** (`process-steps:wire`): heading **How a project runs.** Steps ✔ from seed: Understand the problem · Shape the solution · Build in small steps · Make it dependable · Launch and hand over · Measure and improve.

**Engagement** (`engagement-models`): heading **Ways to work together.** Draft rows:

| Model                        | Best when                                                                             | You get                                                            | How it runs                       | Start / price                         |
| ---------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------- | ------------------------------------- |
| Architecture review          | A system is hurting, or a build is about to be committed to.                          | Written architecture, decision record, risks, delivery roadmap.    | Fixed scope `[CONFIRM:C-15]`      | `[CONFIRM:C-14]`                      |
| Build a product or automation | The problem is clear and you need it working.                                        | Reviewable releases, automated tests, handover docs.               | Milestone-based `[CONFIRM:C-15]`  | `[CONFIRM:C-14]`                      |
| Ongoing partnership          | You need a senior engineer as the system grows, or an architecture partner for your agency. | `[CONFIRM:C-13]`                                              | `[CONFIRM:C-13]`                  | `[CONFIRM:C-14]`                      |

Under-table lines ✎: **Founders and product teams:** bring the idea, leave with a plan and a working first version. **Operations teams:** bring the repetitive task, leave with an automation you can trust. **Agencies:** bring the client brief; I design and build the technical side. **Internal teams:** bring the legacy system; I make the next step safe.

**Fit check** (`fit-check`, tier 2): heading **Who this is for** ✎. *A good fit if:* **Founders and product teams:** bring the idea, leave with a plan and a working first version. **Operations teams:** bring the repetitive task, leave with an automation you can trust. **Agencies:** bring the client brief; I design and build the technical side. **Internal teams:** bring the legacy system; I make the next step safe. *Probably not a fit if (C-32):* you need a large team on call around the clock; you want a website with no system behind it; you want the lowest quote above all else. When the fit check is enabled, the four segment lines move here from under the engagement table.

**Starting-point finder** (`starting-point`, tier 2): heading **Not sure where to start?** · sub **Three questions. A suggestion, not a quote.** Q1 *What is the situation?* (the Triage problems, grouped Systems and AI Automation). Q2 *Where are you now?* **We only have an idea** · **It works but it hurts** · **It runs and is growing.** Q3 *What matters most?* **Speed** · **Reliability** · **Cost.** Draft rules, pending C-13: idea → *Build a product or automation*; works-but-hurts with reliability → *Architecture review*; running-and-growing → *Ongoing partnership*. Result copy: *"Start with {model}. {one-sentence reason}. Describe it and I will tell you honestly whether it fits."* ✎

**Capability stack** (`skill-group-collection:registry`): heading **The tools behind the solutions** ✔ · sub **Chosen for the problem, never the other way round.** ✎

**Commitments** (`commitments`): heading **How I keep projects safe.** Items ✎ (they describe method, not outcomes): *Small, reviewable releases.* *Every decision written down.* *Tests on the critical paths.* *Security built in from the start.* *Handover documentation, so your team is never stuck.* The line "You own the code" appears **only** after C-16.

**How I think** (`commitments:principles`, tier 2): heading **How I think** ✎ *Start with the problem, not the technology. Choose the simplest thing that works. Show the trade-offs. Ship small. Leave it better documented than I found it.* Each gets one elaboration line, approved by you (C-18). The same lines feed About.

**Field notes** (`article-collection:notes`): heading **Field notes** · sub **Lessons from building and running real systems.** Rows are the seeded articles ✔ with their excerpts as takeaways, for example *Keep sign-in working when a protection service is down* and *A database query that only failed on the real server.*

**FAQ rewritten as objections** (`faq-list`): ✎ unless noted.

| Question                                                  | Answer intent                                                                                                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| What does it cost?                                        | Honest range logic or "scoped per project"; what drives cost. `[CONFIRM:C-14]`                                                                      |
| How long will it take?                                    | Why durations vary; first reviewable release is early. `[CONFIRM:C-15]`                                                                             |
| Why not a no-code tool or ChatGPT?                        | "Often you should, and I will say so. Custom pays off when you need reliability, security or integration." Stance `[CONFIRM:C-18]`                  |
| What if the AI gets it wrong?                             | Review gates, logs, fallbacks, switch-off ✔ (consistent with seed).                                                                                 |
| Who owns the code and the data?                           | `[CONFIRM:C-16]`                                                                                                                                    |
| Do I need to be technical?                                | ✔ existing FAQ.                                                                                                                                     |
| What happens after launch?                                | ✔ existing FAQ plus support terms `[CONFIRM:C-17]`.                                                                                                 |
| Can you work with our team or existing code?             | Intent: yes, with a short codebase review first. `[CONFIRM:C-18]`                                                                                   |
| How do we work across time zones?                         | Timezone is `Asia/Dhaka` in seed. State overlap hours only if confirmed. `[CONFIRM:C-06]`                                                           |

**Next steps** (`Site.next_steps`): heading **What happens after you write.** **1 You describe the problem.** A few lines are enough. **2 I reply with a straight answer.** Whether I can help, and what I would need to know. **3 We agree a first small step.** Scope and timing are written down before work starts. ✎ Times are added only if C-04 says so.

**Final CTA** (`contact-cta`): **Describe the problem. I will tell you honestly whether I can help.** · sub **Send a few lines. You will get a straight answer on fit, approach and next step.** (response time added only if `[CONFIRM:C-04]`) · buttons **Start a project** / email.

**About** (copy intent): lead with the client's question, "Who will be solving this?" Principles under **How I think** ✎: *Start with the problem, not the technology. Choose the simplest thing that works. Show the trade-offs. Ship small. Leave it better documented than I found it.* Timeline and credentials stay truth-gated.

**Microcopy**: Buttons: Start a project · Describe your problem · See how I work · Read the case file · Send. States: Sent · Could not send: check your connection and try again. Empty case files, no results, 404 per 3.10. Labels: Problem · Approach · Deliverable · Outcome · Verified · Derived from code.

### 5.5 Case-file template (Problem → Constraints → Architecture → Result)

| Chapter      | Data                                         | Visual                                                          |
| ------------ | -------------------------------------------- | --------------------------------------------------------------- |
| Problem      | `challenge`                                  | Large statement, mono metadata (type, role, duration)           |
| Constraints  | `constraints[]` (new)                        | Bulleted list with hairline separators                          |
| Architecture | `approach`, `key_decisions`, `architecture`  | Sticky SVG diagram; text chapters highlight nodes (M17)         |
| Result       | `results_summary`, `outcomes[]`              | Outcomes with verification mark; count-up only for numeric verified or derived |

The four launch case studies (publishing platform, live-database migrations, contact intake with abuse protection, routine-upkeep automation) are rewritten into this shape with diagrams derived from the repository itself (nodes and edges checked against code in Phase 4). Their existing outcomes stay `derived` and their engagement type stays `internal`, so none of them can be read as client work. Real client case files, if any exist, come from C-19.

---

## 6. Tech plan

### 6.1 Libraries and boundaries

| Library                                         | Purpose                                                                        | Loaded when                                                       | Boundary                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `gsap` (+ `@gsap/react`): core, ScrollTrigger, SplitText | Choreography, scroll scrub, pins, text splitting                       | Dynamic import after hydration when `effectiveMotion === "full"` | Only `src/lib/motion/engine/*` imports GSAP. Features call engine hooks.                                |
| `lenis`                                         | Smooth scroll, synced to the GSAP ticker                                        | Same, fine pointer only                                           | Same engine module. Disabled for reduced/off, touch and when a modal is open.                             |
| `three`, `@react-three/fiber` (drei only if a measured need) | Hero maquette                                                      | Dynamic import after LCP and idle, tier ≥ T2, hero in view         | Only `src/components/three/*` imports them, behind one `HeroCanvas` adapter. Spike S1 also benchmarks OGL (≈ 15 KB gz) as the lean alternative. |
| Existing custom engine                          | `Reveal`, `ParallaxLayer`, `Magnetic`, `MotionProvider`, `ParallaxProvider`    | Always                                                            | Stays as the baseline and tier-T1 fallback, so GSAP is enhancement, not dependency.                       |

**Boundary.** None of GSAP, Lenis, Three or R3F may be imported from `src/app/admin`, `src/components/admin` or `src/components/ui`. Engine-dependent components live in `components/motion` and `components/three`. A unit test walks the import graph and a build-output scan asserts that no `/admin` chunk contains them.

New dev tooling: none beyond the ADR 0002 test stack. `@types/three` added. `transpilePackages: ["three"]` only if the build requires it **[VERIFY in S1]**.

### 6.2 Performance budget (extends ADR 0009)

| Metric / asset                                       | Budget                                                                                         | Source                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| LCP (constrained mobile profile, median of 3)        | ≤ 2.5 s                                                                                        | ADR 0009                        |
| CLS                                                  | ≤ 0.05 lab (field p75 ≤ 0.10)                                                                  | Tightened                       |
| INP / TBT                                            | ≤ 200 ms / ≤ 200 ms                                                                            | ADR 0009 / new                  |
| Initial-route JS                                     | ≤ 180 KB gzip, unchanged                                                                        | ADR 0009                        |
| Third-party-origin JS                                | ≤ 60 KB gzip (nothing external is added)                                                       | ADR 0009                        |
| **Deferred enhancement JS** (new category)           | Motion chunk (GSAP core + ScrollTrigger + SplitText + Lenis) ≤ 60 KB gz (estimate 50–60, measure in S1). 3D chunk (Three + R3F + scene) ≤ 230 KB gz. Neither is loaded for T0/T1, reduced, or no-JS visitors. | **New, ADR 0011 amends 0009**    |
| Hero image (poster)                                  | ≤ 60 KB mobile, ≤ 120 KB desktop                                                               | Within ADR caps (200 / 350 KB)  |
| Fonts blocking first paint                           | ≤ 150 KB woff2 (Display + Text preloaded); Mono lazy                                           | New                             |
| Grain texture                                        | ≤ 16 KB                                                                                        | New                             |
| 3D runtime                                           | T3 p95 frame ≤ 16.7 ms; T2 p95 ≤ 33 ms on the constrained profile; ≤ 40 draw calls; ≤ 150k tris; textures ≤ 16 MB | New |
| Init cost                                            | Scene build in chunks; no single main-thread task > 120 ms; canvas created only after LCP     | New                             |
| Blur                                                 | ≤ 3 visible blurred layers desktop, ≤ 2 mobile; none over animating canvas on T2 or below      | 3.5                             |
| Smoothness, desktop                                  | Scripted 10 s scroll plus interaction run: p95 frame interval ≤ 18 ms, dropped frames ≤ 2 %, ≤ 2 long animation frames (> 50 ms) after hydration | New (3.7.1) |
| Smoothness, constrained mobile (T2)                  | p95 frame interval ≤ 33 ms, dropped frames ≤ 8 %                                               | New (3.7.1)                     |
| Interaction latency (lab)                            | INP p75 ≤ 100 ms on primary interactions; field gate stays ≤ 200 ms                            | Tightened                       |
| Navigation                                           | Visual response ≤ 100 ms after a click; prefetched routes show content ≤ 300 ms                | New                             |
| Home length                                          | Tier 1 ≤ 19 screens of scroll at 1440×900 including pins; Tier 1 + 2 ≤ 22                      | New (4.1)                       |
| Console bundle                                       | Admin shell ≤ 150 KB gz initial; list and editor routes ≤ +60 KB gz each; no animation library in any admin chunk | New                  |
| Console interactions                                 | Filters, selection and toggles ≤ 100 ms; route skeleton visible ≤ 100 ms                       | New                             |
| Lighthouse (median of 3)                             | Performance ≥ 90, Accessibility ≥ 95 on Home, About, Case study, Contact; lhci extended with a mobile profile | ADR 0009 + extended |

**Rule from ADR 0009 kept:** if an enhancement misses a gate, disable it and ship the static fallback. Do not narrow the browser matrix.

### 6.3 Capability tiers and fallbacks

| Tier   | When                                                                                                                   | Experience                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **T3** | WebGL2 + fine pointer + ≥ 6 cores + ≥ 8 GB memory (when reported) + motion `full`                                       | Full maquette, DPR ≤ 1.75, pointer rig, scroll dolly, Lenis, glass over canvas (one panel)                           |
| **T2** | WebGL2, but coarse pointer or ≤ 4 cores or ≤ 4 GB or battery/data hints                                                 | Simplified scene (≈ 60 % blocks), DPR ≤ 1.25, 30 fps cap, scroll dolly only, no blur over canvas                     |
| **T1** | Reduced motion, Save-Data, ≤ 2 GB memory, **software renderer detected** (SwiftShader/llvmpipe via renderer string), or runtime governor demotion | Poster + two CSS parallax layers (only if motion allowed and fine pointer), CSS reveals, no WebGL                    |
| **T0** | No JS, no WebGL2, forced colours, or `?tier=0`                                                                          | Server-rendered poster and full content. Nothing depends on JS                                                       |

Runtime governor: sample frame time for 2 s after init; if the average is under 45 fps (T3) or 24 fps (T2), step down one tier for the session. Never step up. `?tier=0..3` is a QA override. A kill switch (`Site.experience.motion` default, plus an env flag `PUBLIC_3D_ENABLED`) disables 3D without a redeploy of content. The canvas pauses off-screen (IntersectionObserver → `frameloop="never"`), pauses on `visibilitychange`, and unmounts after the hero leaves view to free GPU memory.

**Console:** no tiers. It is CSS only, renders the same on every device, and follows the same motion preference (reduced or off means instant).

### 6.4 Accessibility (WCAG 2.2 AA, plus)

- Contrast is a tested property: token matrix test (all text/surface pairs ≥ 4.5:1, large text ≥ 3:1, UI boundaries ≥ 3:1) plus Playwright pixel sampling under every glass text box and over the canvas.
- Focus: double ring on every interactive element; targets ≥ 44×44 for primary actions (24×24 minimum); skip link kept; visible focus never hidden by sticky header (`scroll-padding-top` already tokenised).
- No information is hover-only. Triage rows, previews and zone panels have focus, keyboard and tap equivalents.
- Motion: `prefers-reduced-motion` and the in-site preference both honoured; 3D has an explicit still-image control; pinned scenes have a no-pin reduced layout; no flashing above 1 Hz.
- `prefers-contrast: more`, `prefers-reduced-transparency` and `forced-colors` remove glass and thicken lines (3.5).
- Diagrams: SVG with `<title>`, `<desc>` and an equivalent text list; canvas `aria-hidden`.
- Command palette follows the combobox/dialog pattern, focus-trapped and restored (reuse `useDialogFocus`).
- Semantics: one `h1` per page, ordered headings, landmarks, DOM order equals reading order, logical CSS properties so RTL does not break (RTL itself is out of scope; locale is `en`).
- Console: 36 px controls with a 44 px hit area on coarse pointers; tables keep real `<table>` semantics with `aria-sort`; status marks always carry text; the editor action bar stays reachable and clear of the on-screen keyboard (`dvh`, visual viewport); error summaries move focus; toasts use `role="status"` or `role="alert"` as appropriate and are never the only error channel; the unsaved-changes guard announces itself.

### 6.5 SEO and metadata

Server-rendered HTML contains all primary content (ADR 0009). Per-route titles and descriptions via existing builders. JSON-LD extended: `Person` (job titles from roles), `Service` for the three offers, `FAQPage` from the FAQ list, `Article` for case studies, `BreadcrumbList`. Monochrome Open Graph image (static first, per-case dynamic later). `theme-color` for dark and light. Site remains `noindex` until the launch gate (Phase 10). Telemetry stays privacy-safe; conversion events listed in 2.3 contain no PII (C-28).

### 6.6 Test strategy

Principle: **test after each phase**, with a focused set per phase and the full gate at phase end.

| Layer                      | What                                                                                                                                                                                                                         | Tooling                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Token and design contracts | Contrast matrix for every text/surface/tone pair; **monochrome guard** (scan public CSS/TSX for non-neutral colour values and colour utility classes); motion-registry completeness (each effect has trigger, meaning, reduced variant, tier) | Vitest                               |
| Domain / data              | Schema, DTO, seed v8 plan, publish gates for new fields, Page kind/layout contract, content gate (no `unverified` value in a published snapshot)                                                                              | Vitest, integration (real Mongo)     |
| Component                  | Each new section: reduced parity, keyboard, roles, empty and error states; palette combobox; topic prefill                                                                                                                    | Testing Library                      |
| E2E                        | Journeys: hero → triage → contact with topic; palette navigation; theme toggle persistence; case-file walkthrough; contact submit (existing). Forced tiers `?tier=0..3`; reduced-motion run; light and dark                  | Playwright (chromium, firefox, webkit) |
| Visual regression          | All public routes × light/dark × 360/768/1280 × reduced motion; hero poster stable. **Monochrome saturation scan**: sampled pixels must have R≈G≈B (±2) except none-allowed regions                                          | Playwright snapshots                 |
| A11y                       | axe on every route and tone; manual keyboard and screen-reader smoke per release                                                                                                                                              | `@axe-core/playwright`               |
| Performance                | lhci extended (Home, About, Case study, Contact; desktop plus constrained mobile); frame-time sampler behind `?debug=perf`; bundle report per route with budget assertions                                                    | `@lhci/cli`, custom script           |
| 3D smoke                   | Headless Chromium with SwiftShader: canvas mounts on T3/T2, pauses off-screen, unmounts, demotes on the governor, never mounts on T0/T1                                                                                        | Playwright                           |
| Smoothness                 | Scripted 10 s scroll plus hover and click run on Home and a case file; samples `requestAnimationFrame` deltas, `long-animation-frame` entries and INP; fails above the 6.2 budgets; desktop and constrained mobile; trace attached on failure                  | Playwright + CDP, `PerformanceObserver` |
| Consistency                | `consistency.spec.ts` (computed-style probe against `archetypes.json`), System lab snapshots, `design-lint.test.ts`                                                                                                           | Playwright, Vitest                   |
| Console                    | Authenticated fixtures (bootstrap admin on the test database): shell, dashboard, one list, one editor, inbox; axe; visual in both themes; existing authority and route-boundary tests unchanged                                | Playwright, Vitest                   |
| Bundle boundary            | Import-graph test and build-output scan: no GSAP, Lenis, Three or R3F in `/admin` chunks or in `components/ui`                                                                                                                  | Vitest + build script                |
| Manual                     | Real Safari macOS/iOS (backdrop-filter, View Transitions), mid-tier Android, 200 %/400 % zoom, `100dvh` and safe areas                                                                                                        | Release checklist (ADR 0009)         |

---

## 7. Phased roadmap

Dependencies: P0 → P1 → P2 → (P3 ∥ P4 ∥ P7) → P5 → P6; P7 → P8; P6 and P8 → P9 → P10. Sizes are relative (S, M, L).

**Definition of done for every phase:** `pnpm typecheck && pnpm lint && pnpm test`; the phase's Playwright specs; from P1 the consistency probe and design lint; from P2 the smoothness harness on every touched route; axe with no critical or serious findings; no 6.2 budget regressed; `docs/design-system/` updated; ledger rows added to `plan.md` and `tasks.md`. Commit boundaries follow the repo's one-logical-slice rule, and no commit carries any AI attribution (global instruction).

**Strangler rule for the admin:** until Phase 7 flips its layout to the console surface, the admin renders exactly as it does today. Primitives are tokenised with their legacy values as fallbacks (3.1).

### Phase 0: Decisions, baseline and spikes (S–M)

- **Work:** write and accept ADR 0011 (Appendix C). Record a fresh baseline: Lighthouse (desktop and constrained mobile, 3 runs), per-route bundle sizes, axe, and screenshots of all public routes in both themes using the demo seed, **plus a smoothness baseline of the current site** from a first version of the harness, so improvement is measured. Spikes:
  - **S1** maquette prototype in isolation (R3F vs OGL; frame time and cost on the constrained profile and a mid Android; measured cost of one glass panel over the canvas).
  - **S2** **live style and motion tile**, a single HTML page you open in a browser: hero type, glass, tones, light and dark, and five working interactions on GSAP + Lenis (line reveal, magnetic CTA with label roll, nav indicator, pinned stack, boundary wipe), plus a **console tile** with a compact-density dashboard mock. This is the feel you sign off.
  - **S3** font payload; View Transitions on Next 16.1.1; Lenis with anchors, back and forward, and modals.
  - **S4** admin feasibility: render the current dashboard, one list and one editor under the console tokens on a branch, to size the Phase 8 batches.
- **Acceptance:** ADR 0011 accepted; baselines committed under `docs/baseline/`; S1 within budget or the tier map or fallback direction adjusted; fonts ≤ 150 KB or the local-subset plan chosen; **you approve the live tile (public and console)**; S4 yields batch estimates.
- **Tests:** existing suites run green to prove a clean start.
- **Risks:** S1 fails → promote Direction B to spine (2.2).

### Phase 1: Design system foundation (M–L)

- **Work:** tokens for both surfaces and densities; mono ramp, semantic tokens and tones; fonts via `next/font` (remove dead `fonts.css`); type scale utilities; glass, grain, texture, hairline and corner-tick primitives; double-ring focus; contrast, transparency and forced-colour handling; **strangler-tokenised primitives** (`Button`, `FormControl`, links, tags, accordion, tabs, table styles, overlays, toast, skeleton, empty and error states); `StatusMark` (built, not yet used by the admin); **archetype templates** (`ChapterPage`, `IndexLayout`, `DetailLayout`, `StoryLayout`, `NarrativePage`, `ConversationLayout`, `DocumentLayout`, `SystemPage`, and console templates stubbed); archetype-shaped `loading.tsx` skeletons; **System lab** skeleton on `/admin/design-system`; design lint, token contrast, monochrome guard; consistency probe scaffold with `archetypes.json`; default theme `dark` for public; Contact map decision.
- **Acceptance:** all public routes render monochrome inside their archetype template; guard, contrast, design-lint and consistency probe green; **admin pixel-identical** (snapshots of sign-in, dashboard, one list); Lighthouse a11y ≥ 95; no CLS from fonts.
- **Tests:** contrast matrix, monochrome guard, design lint, visual snapshots in both themes, axe.

### Phase 2: Motion engine, interaction primitives and smoothness harness (M–L)

- **Work:** the **smoothness harness first** (frame sampler, long-animation-frame observer, scripted scroll, trace on failure) so every later phase is measured; engine under `MotionProvider` (tokens, registry, lazy GSAP and Lenis loader, tier resolver, `?tier=`); `Reveal` v2 (SSR-safe), `TextReveal`, `Counter`, `Magnetic` v2 (fixes the per-`mousemove` `setState`), `Cursor`, `TraceRail`, `PinScene`, route transition (per S3), page-enter preset, command palette (public command set), motion and 3D preference UI, **Motion lab** inside the System lab, registry completeness test.
- **Acceptance:** harness runs in CI and gates; motion chunk ≤ 60 KB gz and absent for reduced, off and touch; initial-route JS ≤ 180 KB; zero motion-caused CLS; pointer components render at most once per pointer sequence (test); reduced and off render equals the end frame; palette operable by keyboard and screen reader; lab INP p75 ≤ 100 ms.
- **Tests:** registry completeness, reduced parity snapshots, palette specs, harness self-test, a11y.

### Phase 3: Shell, hero and 3D (L, highest risk)

- **Work:** public header, footer and trace rail; hero (`topology` layout); maquette scene, materials, camera rig; tiers and governor; poster render script and ingestion through ManagedMedia; kill switches; replace the old hero (and remove `useAutoplayController` and its tests if no consumer remains).
- **Acceptance:** 6.2 budgets met on the constrained profile (LCP, CLS, INP, frame times, chunk sizes); canvas pauses off-screen and unmounts; T0 and T1 render poster only; no-JS shows complete hero content; glass contrast sampling green over the canvas; the zone switcher works without WebGL; harness green on Home.
- **Tests:** tier-forced Playwright specs, 3D smoke, perf sampler, lhci mobile, axe, visual (poster).

### Phase 4: Data model and content layer (M–L, parallel with Phases 3 and 7)

- **Work:** schemas, types, validation, models and DTO builders for 5.2 (tier 1 home additions: evidence metrics fields, `deliverable_samples`, `next_steps`; tier 2: `fit`, `principles`, `finder`, `working_hours`); Page kinds, layouts and route compatibility; seed v8 with the copy deck; launch case studies gain constraints and diagrams; content-truth manifest minor bump and claim IDs; admin editors for the new fields (built with the current admin styling; they inherit the console look in Phase 8); migration if validators exist; content gate test.
- **Acceptance:** `pnpm seed:dry-run` plan is clean; checksum and version rules satisfied; publish rejects unverified engagement fields; edit → publish → public render round trip passes on a real replica set; existing unit files updated and green.
- **Tests:** unit, integration (real Mongo), contract tests for new kinds, admin workspace tests.

### Phase 5: Home chapters (L)

- **Work:** tier 1: Evidence strip, Triage, Stack, Pipeline, Case files, Deliverables, Process wire and Engagement, Capability registry, Commitments and Trust, Field notes, FAQ, Next steps and CTA. Tier 2, built but `visible: false` until confirmed: Fit check, Starting-point finder, How I think. Page composition in the seed; per-section tests.
- **Acceptance:** each section has a keyboard path and reduced parity; no pinned scene exceeds its length budget (max two on Home); Home Lighthouse ≥ 90 and a11y ≥ 95 on the constrained profile; CLS ≤ 0.05; harness green; no hover-only information; Home length within the 4.1 budget (≤ 19 screens Tier 1, ≤ 22 with Tier 2); the evidence strip hides itself with fewer than three qualifying metrics; Tier 2 sections can be switched on from the admin without a deploy; the finder works with the network off.
- **Tests:** component specs, home e2e journeys (triage → contact with topic; finder → contact), visual, axe, lhci, document-height check.

### Phase 6: Public inner pages (L)

- **Work:** every public page on its archetype template: case-file index and walkthrough with the diagram renderer, Lab (projects), articles, videos, details, About, Contact flow, legal, 404, error and loading; `LabSwitcher`; one signature interaction per page; shared-element transition (M30).
- **Acceptance:** **consistency probe green on every public route**; each page uses a template (no private header or CTA band); axe and visual baselines in both themes; contact flow works with and without `?topic=`; diagrams readable without colour and with a text equivalent; harness green on a case file, an index and an article.
- **Tests:** route e2e, visual, axe, consistency, contact abuse paths (existing) still green.

### Phase 7: Console shell, dashboard and shared patterns (M–L, parallel with Phases 3 and 4)

- **Work:** flip the admin layout to `data-surface="console"`; new `AdminShell` (rail, top bar, publish-state chip, environment chip); console command palette; **dashboard redesign (4.3)**; `StatusMark` goes live behind the `StatusBadge` tone API; console styling of `DataTable`, `FormControl`, `Tabs`, `Modal`, `Drawer`, `Toast`; pattern components (`ConsoleList`, `ConsoleToolbar`, `ConsoleEditor`, `EditorActionBar`, `SectionIndex`, `ConsoleInbox`); auth pages (C6); authenticated Playwright fixtures; bundle boundary test; decision on the Enquiries panel (D-08).
- **Acceptance:** shell, dashboard, one list and one editor pass axe, visual (both themes) and keyboard tests; authority, route-boundary and data-boundary tests unchanged and green; no animation library in any admin chunk; shell ≤ 150 KB gz; every "Needs attention" deep link opens the right filtered workspace; sidebar collapse passes the harness or ships instant; no `backdrop-filter` outside overlays; console usability check on status marks (R19).
- **Tests:** console component specs, authenticated e2e, axe, visual, bundle boundary, consistency probe on console routes.

### Phase 8: Console workspaces sweep (L, batched)

- **Work:** restyle the remaining 26 admin components through the shared primitives and patterns, **without changing behaviour**, in six batches. Each batch ends with its own gate before the next starts.
  - **B1** content lists: projects, case studies, articles, videos, project resources.
  - **B2** content editors: project, case-study, article and video forms, repeatable record editor.
  - **B3** Site and Pages editors (the largest files; split into section components only where needed for the section index and action bar, in a separate commit).
  - **B4** inbox: contacts and review moderation.
  - **B5** system: users, audit, taxonomy, media library, profile settings.
  - **B6** remainder: preview, recovery, dialogs.
- **Acceptance per batch:** existing tests green; authenticated visual snapshots (both themes); axe; consistency probe; design-lint allowlist shrinks; no behaviour change (any needed behaviour change is a separate PR). After B6 the design-lint allowlist is empty.
- **Stop rule:** if a batch needs more than restyling to reach the pattern, stop, record the gap, and decide with you before continuing.

### Phase 9: Hardening and motion tuning (M–L)

- **Work:** cross-browser pass (Firefox, WebKit; real Safari and iOS; mid Android); manual accessibility and screen-reader pass; SEO, JSON-LD, OG; performance tuning against 6.2; **motion tuning pass:** for each home chapter and page archetype, record screen captures at 1× and 0.25×, review easing, timing, overshoot and stagger against the 3.7.2 doctrine, fix, then re-run the harness three times in a row; kill-switch drill; lhci route set expanded; visual baselines approved; documentation (`docs/design-system/*`, ADR index, `plan.md` and `tasks.md`).
- **Acceptance:** ADR 0009 release checklist complete; no critical or serious axe findings; all budgets green on three consecutive runs; consistency probe green on public and console routes; you sign off the motion review.

### Phase 10: Content closure and launch (S–M, owner-dependent)

- **Work:** resolve the confirm register (section 8); publish Site and Pages; run the production foundation seed with its confirmation phrase; flip `allow_indexing`; monitor field Web Vitals and conversion events.
- **Acceptance:** the automated content gate proves nothing `unverified` is public; release checklist signed; rollback rehearsed (previous Site snapshot, 3D kill switch, default `?tier`).

### Risks

| #   | Risk                                                                              | Likelihood | Impact | Mitigation / trigger                                                                                              |
| --- | --------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| R1  | Monochrome glass reads flat or "dull"                                             | Medium     | High   | Live tile (S2) is a gate before any build. Lit 3D backdrop, grain, specular edges, inversion bands (3.4).          |
| R2  | Blur over an animating canvas is slow on integrated and mobile GPUs               | High       | High   | Measure in S1; no blur over canvas on T2 or below; one panel only on T3; solid fallback.                           |
| R3  | 3D hurts LCP or TBT                                                               | Medium     | High   | Poster is LCP; canvas after idle; deferred budget; kill switch; governor.                                          |
| R4  | Three + R3F chunk exceeds 230 KB gz                                               | Medium     | Medium | S1 compares raw Three and OGL; fall back to Direction B for the hero.                                              |
| R5  | Variable font payload too large                                                   | Medium     | Medium | Pin axis ranges with `fonttools` and `next/font/local`; metric-matched fallbacks.                                  |
| R6  | Lenis and ScrollTrigger conflict with anchors, focus, sticky header or modals     | Medium     | Medium | Lenis only when full and fine pointer; stop on overlay; `data-lenis-prevent`; tests for anchor and keyboard paths. |
| R7  | View Transitions unsupported or unstable on Next 16.1.1                           | Medium     | Low    | Spike S3; CSS crossfade fallback; feature-detected.                                                                |
| R8  | Schema changes break strict Zod parsing of stored snapshots                       | Low        | High   | All new fields optional with defaults; contract tests against stored v7 fixtures; seed dry-run before apply.        |
| R9  | Existing tests are tightly coupled to old visuals                                 | High       | Low    | Rewrite in the phase that replaces the component; never delete without a replacement.                              |
| R10 | Content unknowns block launch                                                     | High       | High   | Unknowns ship as `unverified` and hidden. Phase 10 is owner-dependent; Phases 1 to 9 are not.                      |
| R11 | Scroll fatigue from pinned scenes                                                 | Medium     | Medium | Max two pins on Home, length budgets, anchors, no-pin reduced layout, owner can set Reduced.                       |
| R12 | Drift into the "AI-generated" look during build                                   | Medium     | Medium | Appendix D checklist is a review gate in every phase.                                                              |
| R13 | Dark-by-default conflicts with a visitor's OS light setting                       | Low        | Low    | First visit dark, three-state toggle persisted (D-02).                                                             |
| R14 | Scope: this is a large programme                                                  | High       | Medium | Phase gates deliver a shippable improvement after Phases 1, 2, 5 and 7. Phase 3 is the only high-risk build.       |
| R15 | The admin sweep is large (63 files, about 17k lines, a 2,175-line site editor)    | High       | Medium | Strangler migration; primitives and patterns first (Phase 7); six gated batches; restyle only; stop rule.          |
| R16 | Consistency drifts while pages are built in parallel                              | Medium     | Medium | Templates, design lint, consistency probe and System lab all exist from Phase 1.                                   |
| R17 | Over-animation and motion fatigue                                                 | Medium     | Medium | Doctrine ("rest is a feature"), one signature interaction per page, two pins maximum, dedicated tuning pass.       |
| R18 | Jank leaks into the admin through shared hooks or providers                       | Low        | Medium | Engine isolated to `components/motion` and `components/three`; bundle boundary test.                               |
| R19 | State is hard to read without colour in dense admin tables                        | Medium     | Medium | Marks with text, pattern fills, usability check in Phase 7; fallback is one rare signal tone (D-06).               |
| R20 | Authenticated e2e needs a replica-set test database and a bootstrap admin in CI    | Medium     | Medium | Reuse the integration-test URI pattern; if unavailable, a mocked-session visual suite plus a manual release item.  |
| R21 | The unsaved-changes guard cannot intercept every App Router navigation            | Medium     | Low    | `beforeunload` plus link-capture best effort; the limit is documented, autosave of a local draft is a later option. |

---

## 8. Open questions and facts you must confirm

Nothing below is guessed in the draft copy. Until confirmed, the data is `unverified` and not shown publicly.

### 8.1 Blocking (needed to start Phase 4 and to launch in Phase 10)

| ID    | Confirm                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------- |
| C-01  | Public display name (and short name) as it should appear.                                                         |
| C-03  | Public email to show; whether phone or WhatsApp is shown.                                                         |
| C-10  | **Lead segment** among founders/SaaS, ops-heavy SMEs, agencies, enterprise. And the order of the others.           |
| C-13  | Which engagement models you actually offer (my draft: architecture review, build, ongoing partnership).           |
| C-19  | Which case studies are real; for each, engagement type (client, internal, open source, lab) and whether the client may be named. |

### 8.2 Facts register

| ID    | Fact needed                                                                                                  | Used in                    |
| ----- | ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| C-02  | Role title wording for the hero (the three current labels OK?)                                                 | Hero, JSON-LD              |
| C-04  | Response-time promise, if any (only if true)                                                                   | Hero, Contact, CTA         |
| C-05  | Availability status, wording and review date                                                                   | Footer, header chip        |
| C-06  | Location and timezone display (seed has `Asia/Dhaka`); overlap hours; keep, grey out or remove the map        | Contact, FAQ               |
| C-07  | Social and profile links to show (GitHub username, LinkedIn, X, YouTube)                                       | Footer, GitHub section     |
| C-08  | Portrait: use `profile.png`? consent to greyscale treatment; alt text                                          | About, hero panel          |
| C-09  | Expose a résumé download?                                                                                      | About                      |
| C-11  | Industries to name, only where you have real experience                                                        | Engagement, About          |
| C-12  | Languages offered; markets served; currency for any prices                                                     | Engagement, FAQ            |
| C-14  | Pricing policy: none, "from" ranges, or scoped per project; minimum engagement                                 | Engagement, FAQ            |
| C-15  | Typical duration per engagement model                                                                          | Engagement, FAQ            |
| C-16  | Contract terms: code and data ownership, NDA availability, payment terms                                       | Commitments, FAQ           |
| C-17  | Post-launch support terms (warranty period, retainer option)                                                   | FAQ, Engagement            |
| C-18  | Approve my voice and stances: "honest fit" promise, "no-code is sometimes the right answer", How I think principles | FAQ, About, CTA        |
| C-20  | Outcomes and metrics per case study, with evidence and dates; only verified or derived values are shown        | Case files, Metrics        |
| C-21  | Any real testimonials with written consent (none today)                                                        | Trust                      |
| C-22  | Work history, education, credentials, courses (existing truth-manifest items)                                  | About                      |
| C-23  | Technology claims in the capability stack (e.g. Python, Redis, RabbitMQ, LLM APIs): hands-on level for each   | Capability, Service tags   |
| C-24  | Years of experience and project counts, if you want them shown                                                 | Hero, About                |
| C-25  | AI providers or models you may name; your data-handling stance for client data sent to models                  | Pipeline, FAQ              |
| C-26  | Legal entity and jurisdiction for Privacy and Terms; data retention periods                                    | Legal                      |
| C-27  | Canonical domain, go-live date for indexing, OG preferences                                                    | SEO                        |
| C-28  | OK to add privacy-safe conversion events (no PII) to the existing telemetry?                                   | Analytics                  |
| C-29  | Are the 6 seeded videos yours or curated third-party picks? (Seed calls them "Recommended watching"; the home heading "See the thinking behind the work" implies they are yours.) | Lab, Home |
| C-30  | Approve the derived numbers shown in the evidence strip (tests passing, migrations, redeploys) and the refresh policy (re-derived at each release; hidden after 180 days) | Home evidence strip |
| C-31  | Which real artifacts may be shown as deliverable samples (ADR excerpts, seeding runbook, dry-run output) and how they are redacted | Home deliverables |
| C-32  | The "probably not a fit if" lines and the segment wording on the fit check | Home fit check (tier 2) |
| C-33  | Working days and hours to publish for the optional working-hours bar | Contact (tier 2) |

### 8.3 Design approvals

| ID   | Decision                                                                                                              | My recommendation                               |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| D-01 | Hero headline: A "Business problems in. Reliable systems out." / B / C                                                 | A                                               |
| D-02 | First-visit theme: always dark, or follow the OS                                                                       | Dark first, three-state toggle                  |
| D-03 | Any personal accessibility constraints on 3D, smooth scroll or cursor effects you want to be conservative about         | Default as planned; every effect is switchable  |
| D-04 | Phase 0 live style and motion tile sign-off, public and console (gate before Phase 1)                                  | Required                                        |
| D-06 | Console colour policy: monochrome with status marks, or monochrome plus one rare signal tone for error and warning in the console only | Monochrome with marks; revisit after the Phase 7 usability check |
| D-07 | Console default theme: System, or Dark like the public site                                                            | System                                          |
| D-08 | Dashboard "Enquiries" panel: include only if the privacy-safe events are stored (needs C-28)                           | Include if stored, otherwise cut                |
| D-09 | Which tier 2 home sections to switch on at launch (fit check, How I think, finder) and whether to add the working-hours bar | Fit check and How I think at launch; finder after the first confirmed enquiries; working hours once C-06 and C-33 are answered |
| D-05 | Retire the generated colour hero images from P12                                                                       | Yes                                             |

---

## Appendix A: Motion effect registry

Every effect must exist in `src/lib/motion/registry.ts` with these fields; a unit test fails on any gap. Tiers: effect runs on T3 / T2 / T1; `—` means not run. **Reduced** = OS or user reduce; **Off** = user off.

| ID  | Name              | Trigger                  | Meaning  | Duration / ease                 | T3 / T2 / T1 | Reduced                         |
| --- | ----------------- | ------------------------ | -------- | ------------------------------- | ------------ | ------------------------------- |
| M01 | Grid draw         | Load (hero)              | Assemble | `scene`, `signal`               | ✓ / ✓ / CSS  | Instant, final grid             |
| M02 | Line settle       | Load, in-view            | Resolve  | `slow`, `signal`, `stagger.line`| ✓ / ✓ / CSS  | Instant                         |
| M03 | Topology in       | Load (after idle)        | Assemble | `scene`, `settle`               | ✓ / ✓ / —    | Poster only                     |
| M04 | Camera dolly      | Scroll scrub (hero 120vh)| Transmit | `scrub.lag`                     | ✓ / ✓ / —    | Fixed still camera              |
| M05 | Pointer depth     | Pointer move             | Respond  | `fast`, lerp                    | ✓ / — / CSS  | None                            |
| M06 | Signal rail       | Scroll progress          | Transmit | `scrub.lag`                     | ✓ / ✓ / ✓    | Static ticks, active tick only  |
| M07 | Reveal rise       | In-view                  | Resolve  | `base`, `signal`                | ✓ / ✓ / CSS  | Opacity 150 ms or instant       |
| M08 | Media wipe        | In-view                  | Resolve  | `slow`, `snap`                  | ✓ / ✓ / CSS  | Instant                         |
| M09 | Label decode      | In-view (first time)     | Resolve  | `base`, ≤ 24 chars              | ✓ / ✓ / —    | Instant text                    |
| M10 | Count-up          | In-view (verified or derived numerics) | Resolve | `slow`, `settle`    | ✓ / ✓ / —    | Final number                    |
| M11 | Stack explode     | Pinned scrub (~250vh)    | Assemble | `scrub.lag`                     | ✓ / ✓ / —    | Static panels, all specs shown  |
| M12 | Pipeline trace    | Pinned scrub (~300vh)    | Transmit | `scrub.lag`                     | ✓ / ✓ / —    | Static diagram, failure line shown |
| M13 | Problem expand    | Click, Enter, in-view    | Transmit | `base`, `settle`                | ✓ / ✓ / ✓    | Instant expand                  |
| M14 | Magnetic CTA      | Pointer near             | Respond  | `fast`, spring                  | ✓ / — / —    | None                            |
| M15 | Sheen             | Pointer over glass       | Respond  | `micro`                         | ✓ / — / —    | Static edge highlight           |
| M16 | Reticle cursor    | Pointer (fine)           | Respond  | lag 120 ms                      | ✓ / — / —    | Native cursor only              |
| M17 | Chapter sync      | Scroll (case file)       | Assemble | `scrub.lag`                     | ✓ / ✓ / —    | All nodes visible, no highlight |
| M18 | Route shutter     | Navigation               | Assemble | 420 ms, `snap`                  | ✓ / ✓ / —    | Instant or crossfade 150 ms     |
| M19 | Wire draw         | Scroll (process, timeline)| Assemble| `scrub.lag`                     | ✓ / ✓ / —    | Complete wire                   |
| M20 | Palette open      | ⌘K / button              | Respond  | `fast`, `signal`                | ✓ / ✓ / ✓    | Instant                         |
| M21 | Theme flip        | Toggle                   | Respond  | 480 ms circular reveal          | ✓ / ✓ / —    | Instant swap                    |
| M22 | Footer wordmark   | Scroll into footer       | Resolve  | `scrub.lag`                     | ✓ / ✓ / —    | Static wordmark                 |
| M23 | Velocity coupling | Scroll velocity          | Transmit | damped, ≤ 3° skew               | ✓ / — / —    | None                            |
| M24 | Boundary wipe     | Scroll (tone change)     | Assemble | `scrub.lag`, 30vh               | ✓ / ✓ / —    | Instant tone change             |
| M25 | Frame parallax    | Scroll (media frames)    | Assemble | `scrub.lag`, ±8 %               | ✓ / ✓ / —    | Static image                    |
| M26 | Underline draw    | Hover, focus             | Respond  | `fast`, `signal`                | ✓ / ✓ / ✓    | Instant underline               |
| M27 | Label roll        | Hover, press, loading    | Respond  | `micro`, press 50 ms            | ✓ / — / —    | Colour-free state swap, no roll |
| M28 | Nav indicator     | Route or hover change    | Respond  | `base`, `settle`                | ✓ / ✓ / ✓    | Instant                         |
| M29 | Glass tilt        | Pointer over featured glass | Respond | spring, ≤ 3°                  | ✓ / — / —    | None                            |
| M30 | Shared-element morph | Navigation             | Assemble | 420 ms, `snap`                  | ✓ / ✓ / —    | Instant or crossfade            |
| M31 | Path draw         | Scroll, in-view          | Transmit | `scrub.lag` or `slow`           | ✓ / ✓ / —    | Complete path                   |
| M32 | Field focus       | Focus, valid, invalid    | Respond  | `fast`                          | ✓ / ✓ / ✓    | Instant                         |
| M33 | Skeleton breathe  | Loading                  | Resolve  | 1.4 s loop                      | ✓ / ✓ / ✓    | Static skeleton                 |
| M34 | Reading progress  | Scroll (articles, case files) | Transmit | linear                     | ✓ / ✓ / ✓    | Static or hidden                |
| M35 | Header hide and show | Scroll direction and speed | Respond | `base`, `snap`               | ✓ / ✓ / ✓    | Header always visible           |

**Console registry** (calm preset, 3.7.3). Same required fields, no tiers.

| ID  | Name                    | Trigger                | Duration / ease   | Reduced |
| --- | ----------------------- | ---------------------- | ----------------- | ------- |
| C01 | State transitions       | Hover, focus, select   | 100 to 160 ms     | Instant |
| C02 | Route content fade      | Navigation             | 150 ms            | Instant |
| C03 | List insert and remove  | Data change            | 180 ms (FLIP)     | Instant |
| C04 | Toast                   | Mutation result        | 160 ms in         | Instant |
| C05 | Skeleton breathe        | Loading                | 1.4 s loop        | Static  |
| C06 | Sidebar collapse        | Toggle                 | 160 ms            | Instant |
| C07 | Dialog, drawer, palette | Open, close            | 160 ms            | Instant |

## Appendix B: File map (planned)

| Area                | Create                                                                                                                                                                                                                                  | Modify                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Tokens and type     | `src/assets/styles/public/{tokens,tones,type,glass,texture}.css`, `src/app/(common)/fonts.ts`, `public/textures/grain.png`                                                                                                              | `src/app/globals.css` (imports), `src/app/(common)/layout.tsx` (surface scope), remove dead `assets/styles/base/fonts.css`    |
| Motion              | `src/lib/motion/{tokens,registry,tier}.ts`, `src/lib/motion/engine/{gsap,lenis,scroll}.ts`, `src/components/motion/{text-reveal,counter,cursor,trace-rail,pin-scene}.tsx`                                                                | `src/providers/motion-provider.tsx` (tier + engine hooks), `components/motion/reveal.tsx`, `components/ui/magnetic.tsx`      |
| 3D                  | `src/components/three/{hero-canvas,topology-scene,materials,rig,tier-governor}.tsx`, `scripts/render-hero-poster.ts`                                                                                                                      | `src/components/(common)/home-page/hero-section/index.tsx` (replace carousel)                                                 |
| UI                  | `src/components/ui/{glass,command-palette,mono-label,hairline,corner-ticks}.tsx`, `src/components/diagrams/architecture-diagram.tsx`, `src/components/partials/lab-switcher.tsx`                                                       | `partials/Header`, `partials/footer`, `ui/button.tsx`, `ui/form-control.tsx`, `ui/theme-switcher.tsx`, `ui/motion-control.tsx` |
| Sections            | `src/components/sections/{problem-index,engagement-models,commitments,deliverable-samples,fit-check,starting-point}-section/index.tsx`                                                                                                                                                | Rewrite `{pillar-showcase,architecture-workflow,services,skills,process-steps,contact-cta,metrics-strip}-section`, `evidence-sections`, `pages/public-page-sections.tsx` |
| Data                | Migration (if needed) in `src/lib/db/migrations/`                                                                                                                                                                                        | `app/api/{site,services,case-studies,pages}/*` types, validation, models, DTO builders; `lib/seed/{foundation,launch-content}.ts`; `docs/content/content-truth.v1.json` |
| Templates           | `src/components/templates/{chapter-page,index-layout,detail-layout,story-layout,narrative-page,conversation-layout,document-layout,system-page}.tsx`, `docs/design-system/archetypes.json`                                              | `components/pages/public-route-page.tsx`, `(common)` route files and `loading.tsx` files                                      |
| Console             | `src/assets/styles/console/{tokens,density}.css`, `src/components/templates/console-{overview,list,editor,inbox,settings,auth}.tsx`, `src/components/ui/{status-mark,editor-action-bar,section-index,console-toolbar}.tsx`, `src/components/admin/dashboard/*` | `components/admin/admin-shell.tsx`, `app/admin/(protected)/{layout,page,loading}.tsx`, `ui/{status-badge,data-table,table,form-control,tabs,modal,drawer}.tsx`, all `components/admin/*` workspaces in Phase 8 |
| System lab          | Motion lab and state matrix inside the existing page                                                                                                                                                                                     | `app/admin/(protected)/design-system/page.tsx`                                                                                |
| Admin data editors  | Editors for new Site arrays, Service problems, Case study constraints and architecture                                                                                                                                                   | Existing admin workspaces (behaviour unchanged)                                                                               |
| Tests               | `tests/unit/{token-contrast,monochrome-guard,design-lint,motion-registry,content-gate,bundle-boundary}.test.ts`, `tests/e2e/{home-journeys,tiers,palette,case-file,smoothness,consistency,console}.spec.ts`, `tests/e2e/support/{frame-sampler,admin-session}.ts` | `tests/e2e/visual.spec.ts` (all routes), `lighthouserc.json` (routes + mobile profile)                                       |
| Docs                | `docs/architecture/0011-monochrome-public-surface-and-enhancement-budget.md`                                                                                                                                                             | `docs/design-system/{tokens,archetypes,components,motion}.md`, `docs/architecture/README.md`, `plan.md`, `tasks.md`           |

## Appendix C: ADR 0011 outline (to be written in Phase 0)

1. **Context:** monochrome identity, 3D and scroll choreography goals, ADR 0002's motion-framework ban.
2. **Decision:** amend ADR 0002 to allow `gsap` (+ `@gsap/react`), `lenis`, `three`, `@react-three/fiber` (drei only on measured need). Each lives behind a repository-owned adapter, is loaded after hydration (and after LCP for 3D), and is absent for reduced/off, T0/T1 and no-JS visitors. Existing custom reveal, parallax and `MotionProvider` remain the baseline.
3. **Amend ADR 0009:** add a *deferred enhancement JS* budget (motion ≤ 60 KB gz, 3D ≤ 230 KB gz), tighten lab CLS to ≤ 0.05, add 3D runtime budgets and the tier map. Initial-route and third-party budgets are unchanged.
4. **Amend ADR 0001 (note):** `accent` is retained but inert on the public surface; role identity is carried by texture and glyph. No contract change.
5. **Surfaces:** one token system applied through `[data-surface="public"]` and `[data-surface="console"]` plus `[data-density]`. Admin flips to the console surface in Phase 7 under a strangler migration. The console never loads the animation or 3D libraries (bundle boundary test).
6. **Retire** the P12 generated colour hero set; the hero poster is rendered from the scene through ManagedMedia.
7. **Consequences, verification, rollback:** kill switches, tier override, per-phase gates; removal path for each library.

## Appendix D: Anti-template checklist (review gate for every phase)

The three looks AI tools converge on are a cream background with a serif and terracotta accent, near-black with one acid accent, and a newspaper-column layout. This plan keeps the brief's mandated near-black/white but removes the accent entirely and differentiates through structure, type and form.

- [ ] No coloured gradient blobs, no hue gradients, no neon glow.
- [ ] No floating particle network. Any 3D reads as an architecture drawing: orthogonal, bevelled, labelled.
- [ ] No centred hero plus three identical rounded cards. Hero is left-set with a bleeding scene; offers are a stack; engagement is a spec table.
- [ ] No `01 / 02 / 03` markers except the process, where order is real.
- [ ] No emoji, no stock isometric glass, no fake browser mock-ups.
- [ ] No vague copy: every block states a problem, an approach, a deliverable or an outcome.
- [ ] Typography is a visible part of the identity (expanded Archivo statements, Martian Mono annotations); nothing falls back to the system font.
- [ ] Spend boldness once: the Signal pulse and maquette are the signature; everything else stays quiet.
- [ ] Remove one accessory before shipping each chapter (candidate cuts: cursor reticle, sheen, decode labels).
- [ ] Every effect in the registry has a meaning and a reduced variant.
- [ ] Nothing hidden before JS; nothing claimed that is not verified or derived.
- [ ] Every page uses an archetype template; none rebuilds a header, `CtaBand` or grid.
- [ ] No colour, radius or shadow literal outside tokens (design lint green).
- [ ] Exactly one signature interaction per inner page; the rest follows the page-enter preset.
- [ ] Smoothness harness within budget; no layout in animation frames; pointer effects never set React state.
- [ ] Console: no animation library, status marks always carry text, every action has a keyboard path, dashboard leads with what needs attention.
