# Portfolio Transformation Master Plan

**Project:** `foysalahmedmin-portfolio-next.js`
**Plan version:** 2.1
**Audit date:** 2026-07-15
**Last reconciled:** 2026-07-17
**Status:** Active execution from a clean, verified Git checkpoint; product completion and release verification remain
**Execution ledger:** [`tasks.md`](./tasks.md)

## 0. Execution and handoff dashboard

This document is the product and architecture contract. [`tasks.md`](./tasks.md) is the authoritative checkbox ledger. A task is marked complete only when its implementation and proportional verification are present. The recovery work is now isolated in reviewable commits; phase states remain conservative until their full acceptance gates pass.

| Phase                             | Current state | Delivered or verified now                                                                                                                                                                | Remaining release work                                                                |
| --------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| P00 — Audit and decisions         | Partial       | Architecture decisions, redacted truth manifest, test foundation, and technical baseline are versioned                                                                                   | User-owned verified facts and the reproducible browser/visual baseline matrix         |
| P01 — Public integrity            | Verification  | Public projections, visibility rules, contracts, and admin route protection are implemented and committed                                                                                | Final aggregate/populate and release-wide regression acceptance                       |
| P02 — Security boundaries         | Verification  | Contact intake, safe rich content, managed media, and durable admin sessions are implemented; the replica-set integration suite passes                                                   | End-to-end abuse/session/media acceptance                                             |
| P03 — Design system               | Verification  | Custom tokens, typography, layout, async states, and accessible primitives are implemented                                                                                               | Cross-device visual and accessibility acceptance pass                                 |
| P04 — Motion/parallax             | Verification  | Reduced-motion policy, reveal, parallax, autoplay, and focus behavior are implemented without a runtime motion framework                                                                 | Browser trace and final narrative-level motion tuning                                 |
| P05 — Resilience/testing          | Partial       | Route states, deterministic fallbacks, Playwright/axe/Lighthouse foundations, and CI wiring exist                                                                                        | Production-build browser matrix, saved baselines, and visual regression approval      |
| P06 — Migrations/domain evolution | Verification  | Migration runner, audit foundation, content contracts, and File metadata evolution are committed; replica-set integration passes                                                         | Production rehearsal, rollback, and operational acceptance                            |
| P07 — Site/five pillars           | Verification  | Revisioned Site singleton, exactly-five-pillar invariant, published cache, metadata helpers, and build verification are committed                                                        | Final browser/cache-invalidation acceptance                                           |
| P08 — Pages/repeatables           | Verification  | Typed fixed pages, repeatable domains, inbox/dashboard services, and published page resolver are committed                                                                               | Final admin/public cross-domain browser acceptance                                    |
| P09 — Seeds                       | Partial       | Idempotent guarded seed engine and expanded truthful draft foundation seed are implemented                                                                                               | Real-database seed run; verified production records require approved user facts/media |
| P10 — Admin shell/dashboard       | Verification  | Capability-aware accessible shell and real operational dashboard are implemented and committed                                                                                           | Browser and cross-device acceptance                                                   |
| P11 — Admin content OS            | Verification  | P11.1–P11.5 editorial, Site/Page, repeatable, media, inbox, taxonomy, resource, review, user, and audit workspaces are committed with server/data authority coverage                     | Production-like authenticated admin browser acceptance remains in P20.2               |
| P12 — Generated media             | Partial       | The 17-master Architected Intelligence manifest, prompt grammar, negative constraints, provenance template, truthful pending intents, and seed/media binding prerequisites are committed | Generate, review, optimize, ingest, attach, and verify the non-human media set        |
| P13 — Public shell/hero           | Partial       | Dynamic Header/Footer and accessible five-slide hero run with deterministic fallbacks                                                                                                    | Attach approved managed hero media and finish browser/performance verification        |
| P14 — Homepage                    | Partial       | Server Page composition and several dynamic evidence sections are implemented                                                                                                            | Complete sticky five-pillar, architecture, AI workflow, proof/process/trust narrative |
| P15 — Projects                    | Verification  | URL-backed discovery, accessible responsive filters, role projection, and case-study detail are committed with focused tests                                                             | Full browser/device acceptance                                                        |
| P16 — Articles                    | Verification  | URL-backed discovery and safe editorial detail are committed with focused tests                                                                                                          | Full browser/device acceptance                                                        |
| P17 — About/contact/legal         | Partial       | Contact and legal flows are dynamic and hardened; About consumes published Page/Site data                                                                                                | Complete the deeper About narrative and renderer-parity preview                       |
| P18 — SEO/performance             | Partial       | Metadata/JSON-LD, image fallbacks, security policy, and Web Vitals foundations exist                                                                                                     | Full image/font/network audit, CWV measurement, and budget enforcement                |
| P19 — Security/a11y/ops           | Partial       | CSP, request context, redacted logging, privacy-safe telemetry, and core accessibility primitives exist                                                                                  | End-to-end abuse, accessibility, observability, and operational acceptance pass       |
| P20 — Launch                      | Pending       | Release gates and rollback requirements are defined                                                                                                                                      | Complete all automated/manual gates plus user-owned content and credential approval   |

### Handoff invariant

- Continue from the first unchecked item in the `Current next action` section of [`tasks.md`](./tasks.md); do not restart completed foundations.
- Preserve the custom UI constraint: no shadcn, TanStack Table, or runtime motion framework.
- Keep `storage.middleware.ts` and `ManagedMediaService` as the single provider-neutral media boundary; content modules never call Cloudinary/GCP directly.
- Never turn demo data, pending media, or unverified claims into public production content.
- End each logical slice with focused tests, diff inspection, ledger updates, and an isolated commit.

### Stable Git checkpoint — 2026-07-16

The recovery audit ended at clean product checkpoint `c06ff91`. The dependency-ordered commit chain is:

1. `d27203b` — track the portfolio roadmap and execution ledger.
2. `106aee5` — remove duplicate case-conflicting partials.
3. `1008baa` — establish secure platform and data foundations.
4. `33aa9ee` — build the custom design and motion system.
5. `8f19a0f` — build the secure admin content workspace.
6. `c06ff91` — rebuild the dynamic public portfolio experience.

`1008baa` is an intentional dependency-layer checkpoint and was not independently type-clean against the legacy UI. The supported stable product boundary is the complete chain through `c06ff91`. At that boundary the worktree is clean; TypeScript, lint, 542/542 unit tests, the real MongoDB replica-set integration run, the isolated Contact Chromium flow, and the 65-page no-database production build pass.

### P11 implementation checkpoint — 2026-07-16

P11.1–P11.5 are isolated in the dependency-ordered chain from `8def2a4` through `7b7b2cf`, including the shared editorial framework, Process editor, Contact inbox, audit log, Users, Reviews, ProjectResources, Taxonomy, server-side hierarchy integrity, cross-workspace authority contracts, and real route/data boundary tests. The interleaved `ba98f68` starts P12 documentation without changing that P11 boundary.

At `7b7b2cf`, 118 unit files and 684/684 tests pass, as do TypeScript, full lint, and the 65-page no-database production build. The current environment has no replica-set test URI, so the six real-Mongo integration files (26 cases) were discovered but skipped rather than claimed as a fresh pass. Authenticated admin Playwright acceptance also remains open; P11 is therefore `Verification`, not release-complete.

## 1. Executive outcome

Transform the current portfolio from a styled template into a distinctive, production-grade product that demonstrates five capabilities consistently:

1. Frontend Engineering
2. Backend Engineering
3. AI Automation
4. System Design
5. Full-Stack Development

The finished product must work at three levels at once:

- A potential client should quickly understand what Foysal can solve, see credible proof, and know how to start a conversation.
- A technical reviewer should see thoughtful frontend architecture, secure backend boundaries, data modeling, accessibility, performance, testing, and operational discipline.
- Foysal should be able to update the site safely through a polished admin experience without editing source code.

The work will be completed milestone by milestone. Each implementation milestone ends with focused verification and a small, reviewable commit.

## 2. Non-negotiable product principles

### 2.1 Truth before decoration

- No fabricated testimonials, clients, metrics, outcomes, employment facts, or working links.
- A claim is published only when it is verified, derived from real data, or clearly labeled as an engineering lab/demo.
- Missing proof is handled with an honest fallback, never invented content.
- Every visible action must work. Inert buttons and simulated success states are release blockers.

### 2.2 One positioning source

- Editable professional positioning, short/long display variants, bio, contact details, availability, social links, navigation, footer, SEO defaults, and managed fallback media come from the published Site module.
- A small versioned TypeScript contract owns only the invariant pillar keys/order, safe emergency labels, and lightweight code-owned fallback visuals. Seeds are generated from that contract; it is not a second editable CMS.
- Components must not independently invent role labels such as “Application Developer,” “Software Engineer,” or “System Architect.”
- Page-specific copy may vary, but it must map back to the same five-pillar message.

### 2.3 Custom product system

- Keep the UI component system custom-built.
- Do not add shadcn, TanStack Table, or a runtime animation framework.
- Reuse and improve the existing custom DataTable, form, modal, dropdown, upload, and navigation primitives.
- Add a dependency only when it provides a capability that would be unsafe or wasteful to recreate, and document that decision first. Test-only tooling is evaluated separately from runtime UI dependencies.

### 2.4 Motion with purpose

- Animation must explain hierarchy, continuity, depth, or system behavior—not merely make every card move.
- Parallax is required in the hero, five-pillar narrative, and selected case-study media, but it must be transform-only, subtle, performance-budgeted, and removable.
- Reduced-motion users receive a complete, elegant static experience.
- Any automatic motion lasting longer than five seconds has a visible pause/stop control.

### 2.5 Storage abstraction remains authoritative

- All HTTP-uploaded media enters through the File module and `storage.middleware.ts` flow.
- `storage.middleware.ts`, the File API, and trusted seed/media scripts call the same provider-neutral managed-media ingestion service. CLI work must not duplicate provider logic or make internal HTTP requests.
- Content modules store File ObjectIds, never provider-specific URLs or direct Cloudinary/GCP logic.
- The configured provider may be Cloudinary or GCP; content behavior remains provider-agnostic.
- Immutable code-native icons/SVG diagrams may live in source. Editorial/generated raster media belongs in managed storage.

### 2.6 Typed content, not an unrestricted page builder

- Use explicit models and discriminated section schemas.
- Do not store arbitrary component paths, executable JavaScript, unrestricted JSON blobs, or unsanitized HTML.
- Public DTOs expose only published, necessary fields.
- Admin drafts and previews are isolated from public data.

## 3. Verified baseline

The audit covered 297 TypeScript/TSX source files, 77 API route handlers, 23 custom UI components, 9 public pages, and 9 admin pages.

At the original 2026-07-15 baseline, these quality commands passed:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

That statement is historical, not the current release verdict. The active transformation now includes unit/integration suites, Playwright/axe/Lighthouse configuration, a migration runner, and guarded seed tooling. On 2026-07-16, TypeScript and lint passed; the latest unit run passed 99 files and 542/542 tests. The real MongoDB replica-set integration run passed 6 files/26 tests, with its combined run passing 103 files/556 tests. The ProjectGallery focus-restoration flake was removed by stabilizing the modal state callback. A production build without `DATABASE_URL` now emits all 65 static pages; legal routes use their honest noindex fallback for known database-unavailable conditions while programming/query/content errors still surface. The isolated Chromium Contact flow passes 3/3 with scoped status assertions and a verified isolated-server marker. Full cross-browser, Lighthouse, and visual acceptance still require release evidence.

### 3.1 Strengths to preserve

- Clear route/controller/service/repository/model pattern across most backend modules.
- Zod validation and role-protected admin API routes.
- MongoDB/Mongoose data layer with soft-delete patterns.
- Provider-agnostic File/Storage work supporting Cloudinary and GCP.
- File reference tracking and reusable upload components.
- A strong custom DataTable foundation with selection and bulk behavior.
- Theme support, reusable UI primitives, and responsive Tailwind styling.

### 3.2 P0 integrity and security gaps

These are fixed before the visual expansion:

1. The contact form waits and reports success without calling the existing Contact API.
2. Published articles expire after 24 hours by default, causing legitimate content to disappear.
3. Homepage projects/articles use internal readers rather than public-safe visibility projections.
4. Public ProjectResource responses can expose private resources.
5. Public Review responses can expose pending/rejected records and author email data.
6. Public user detail can expose role, status, email, and verification information.
7. Public categories do not consistently filter inactive records.
8. Admin pages do not have reliable server-side route protection; the unused client guard points to the wrong route.
9. Project/article rich HTML is rendered without server-side sanitization.
10. Contact/auth/write endpoints need rate limits and abuse/CSRF controls.
11. Upload checks need signature/dimension/purpose validation rather than trusting client MIME alone.
12. Soft-delete bypass behavior is inconsistent, which can break restore/permanent-delete flows.
13. Entity mutation and File-reference reconciliation are not transactional.
14. Several frontend/backend contracts disagree: slug fields, category fields, form requirements, search query keys, and user endpoints.
15. Visible actions are inert: project links, article share, admin logout/notifications, and some dashboard actions.

### 3.3 P0 resilience gaps

- Referenced assets `/images/placeholder.png`, `/images/placeholder-article.png`, `/images/hero-banner.png`, and `/images/logo.png` do not exist.
- Suspense fallbacks are `null`, so sections can vanish while loading.
- List fetch failures look like empty results and have no retry path.
- Missing detail records do not reliably return real 404 responses.
- There are no route-level loading, error, not-found, or global error surfaces.
- Current public statistics contradict each other and appear unverified.
- Current generic testimonials require proof and consent before publication.

### 3.4 Design and motion gaps

- The hero has only three slides and does not represent Frontend or Backend independently.
- The site has no parallax system.
- Reveal CSS expects `data-observed-*` attributes, but the active observer only adds `active`; most reveal behavior is disconnected.
- Six reveal observers each create a subtree MutationObserver, which does not scale.
- There is no `prefers-reduced-motion` strategy despite autoplay, marquee, float, pulse, bounce, magnetic, smooth-scroll, and count-up behavior.
- The global `.container` is capped near `max-w-3xl`, constraining desktop grids and preventing a premium spatial system.
- Tokens are mostly neutral defaults with no brand/pillar semantics, coherent spacing, elevation, type scale, or motion scale.
- Raw `<img>` is used throughout content. The 932 KB profile image and all hero images bypass Next image optimization.
- The 1.6 MB `logo.svg` embeds raster data and is not a lean production vector.

### 3.5 Content and information architecture gaps

- Most identity, services, skills, timeline, education, credentials, process, statistics, FAQ, testimonials, navigation, footer, legal, and contact data is hardcoded inside components.
- Home contains many loosely connected sections instead of a deliberate client journey.
- About repeats much of Home rather than providing a deeper personal and technical narrative.
- Project records are not yet case-study grade.
- Article presentation lacks a dependable editorial renderer, table of contents, code treatment, and working sharing.
- Admin only manages projects, articles, and a narrow profile form; its dashboard is mocked and several navigation destinations are missing.

## 4. North-star positioning and content contract

### 4.1 Canonical pillar order

The following keys and labels are stable across database, code, admin, filters, metadata, seed data, and visual tokens:

| Sequence | Key             | Public label           | Client outcome                                                           |
| -------: | --------------- | ---------------------- | ------------------------------------------------------------------------ |
|        1 | `frontend`      | Frontend Engineering   | Polished, accessible interfaces that feel fast and intentional           |
|        2 | `backend`       | Backend Engineering    | Secure APIs, durable data models, and reliable business workflows        |
|        3 | `ai_automation` | AI Automation          | Practical AI workflows that remove repetitive work and improve decisions |
|        4 | `system_design` | System Design          | Clear architectures that remain observable, resilient, and scalable      |
|        5 | `full_stack`    | Full-Stack Development | Accountable end-to-end delivery from product idea to production          |

### 4.2 Canonical professional line

Short form:

> Frontend Engineering · Backend Engineering · AI Automation · System Design · Full-Stack Development

Umbrella statement:

> I design polished frontend experiences, engineer secure backends, automate workflows with AI, architect scalable systems, and deliver full-stack products end to end.

The final copy will be edited for Foysal’s real experience and voice, but these concepts and labels remain stable.

### 4.3 Content voice

- Human, direct, calm, technically credible, and client-focused.
- Prefer “what changed for the user/business” over adjective-heavy self-promotion.
- Explain complex engineering in plain language, then expose deeper technical evidence for reviewers.
- Avoid generic phrases such as “passionate developer,” “cutting-edge,” and “game-changer” unless supported by a concrete example.
- Case-study narrative: problem → constraints → decisions → implementation → security/reliability → measurable result → learning.
- AI content must describe a real workflow, data boundary, evaluation method, and human control—not generic AI imagery or claims.

### 4.4 Claim verification

Every quantitative or third-party claim has one of these states:

- `derived`: calculated from published records.
- `verified`: manually approved with evidence/source.
- `unverified`: admin-only and never public.
- `not_applicable`: narrative content that makes no factual claim.

Testimonials additionally require consent, source, relationship, and optional proof metadata. If there are no verified testimonials, the public site renders a proof/case-study section instead.

## 5. Target public information architecture

### 5.1 Global shell

- Skip link and semantic landmarks.
- Responsive header with stable five-pillar positioning, route-aware navigation, availability indicator, resume, and contact CTA.
- Accessible mobile navigation dialog with focus trap, Escape behavior, scroll lock, and focus restoration.
- Site-wide motion preference control in addition to OS reduced-motion support.
- Footer sourced from Site settings with canonical positioning, current contact/social details, availability, legal links, and no duplicated constants.

### 5.2 Home journey

The homepage becomes a focused sales and proof narrative:

1. Five-slide pillar hero.
2. Verified proof/availability strip.
3. Sticky five-pillar capability narrative with meaningful parallax.
4. Selected case studies with problem, role, architecture, and result.
5. System-design proof: one interactive architecture story.
6. AI-automation proof: one understandable workflow story.
7. Concise working process.
8. Selected insights/articles.
9. Verified endorsement or evidence-based alternative.
10. Qualification-focused contact CTA.

The current 13-section sequence is reduced or recomposed so each section advances the visitor’s decision.

### 5.3 About

- Personal positioning and working philosophy.
- Genuine portrait only if Foysal wants one; never an AI-generated person.
- Abstract non-human identity visual is the default direction.
- Dynamic experience, education, credentials, principles, and current focus.
- Evidence-led skills map around the five pillars.
- No wholesale duplication of the homepage.

### 5.4 Projects

- Server-rendered initial results.
- URL-backed search, pillar, technology, project type, year, and sort filters.
- Honest type labels: client work, internal product, open source, or engineering lab.
- Cards show role, primary pillar, stack, and one verified outcome.
- Slug-based detail pages with canonical redirects from legacy IDs.
- Detail structure: overview, problem, constraints, role, architecture, decisions, implementation, security, performance/reliability, outcome, gallery, stack, learnings, resources, related work.
- Live/source controls only render when valid, allowed URLs exist.

### 5.5 Articles

- Server-rendered initial results with featured content and URL-backed filters.
- Stable slug URLs, reading time, updated dates, author, pillar/topic relationships, and related articles.
- Safe typed/editorial content renderer with code blocks, copy-code, anchors, table of contents, image captions, and semantic typography.
- Working native share with copy-link fallback.
- Expiry is opt-in, never automatically one day.

### 5.6 Contact

- Real Contact API submission.
- Accessible field labels, validation, status announcements, retry, deduplication, rate limiting, honeypot, and privacy copy.
- Project-fit fields may include engagement type, timeline, budget range, and optional context, but remain concise.
- Replace the dominant third-party map with a lighter location/availability panel; load a map only after explicit interaction if retained.
- Admin inbox tracks new, read, replied, qualified, spam, and archived states.

### 5.7 Legal and system pages

- Versioned Terms and Privacy content with effective dates and contact owner.
- Custom not-found, global error, route error, loading, and maintenance-friendly states.
- Robots, sitemap, manifest, icon set, Open Graph routes, and optional article feed.

## 6. Design system: “Architected Intelligence”

The visual direction combines editorial clarity with system-diagram precision. It should feel authored by an engineer who understands product design, not like a neon developer template.

### 6.1 Foundation tokens

Create typed CSS custom properties and documented utilities for:

- Warm ivory/graphite surfaces in light and dark themes.
- Brand accent: restrained electric blue.
- Pillar accents: cyan, emerald, violet, amber, and brand-blue synthesis.
- Semantic status colors with verified contrast.
- Fluid type scale, display/body/mono roles, weights, line lengths, and optical spacing.
- 4/8-based spacing scale and responsive section rhythm.
- Content widths: wide 1280–1360 px system grid and 65–75 character reading measure.
- 12-column desktop grid with explicit tablet/mobile collapse rules.
- Border, radius, shadow, elevation, overlay, blur, and z-index scales.
- Focus ring, selected state, disabled state, error state, and high-contrast behavior.
- Motion duration/easing/distance/depth tokens.

### 6.2 Typography

- Use licensed, self-hosted variable fonts through `next/font/local` when available.
- Pair a precise display sans with a readable body face and a restrained mono face for technical artifacts.
- Do not ship missing local font references.
- Establish styles for display, H1–H6, lead, body, small, label, code, quote, metric, and editorial content.

### 6.3 Layout primitives

- Replace the global `max-w-3xl` container override.
- Add `Container`, `Section`, `Stack`, `Cluster`, `Grid`, `Bleed`, and reading-measure primitives.
- Define responsive page gutters and section spacing once.
- Test 320, 375, 768, 1024, 1440, and 1920 widths with no horizontal overflow.

### 6.4 Component families

- Buttons/links: correct element semantics, polymorphism only where safe, no nested interactive elements.
- Inputs: labels, descriptions, errors, pending/success states, keyboard behavior.
- Cards: editorial, case study, technical diagram, metric/proof, quote, admin data card.
- Navigation: header, tabs, breadcrumbs, pagination, command/search patterns.
- Feedback: skeleton, empty, error/retry, stale-data, toast/live status, confirmation.
- Overlays: modal, drawer, menu, lightbox with focus management.
- Media: optimized image, pillar fallback, generated asset, caption, aspect/focal behavior.
- Admin: DataTable, filters, bulk actions, form sections, publish bar, content status, revision conflict.

### 6.5 Design review gates

- Both themes pass contrast and focus-state checks.
- The five pillar colors remain semantic accents, not full-page rainbow decoration.
- Glass effects are rare and purposeful.
- Card radius, hover lift, and shadows follow a small documented set.
- Every section has a clear visual role and does not repeat the same card grid treatment.

## 7. Motion and parallax architecture

### 7.1 Custom motion layer

Create dependency-free primitives:

- `MotionProvider`: resolves OS preference, site preference, device capability, and tab visibility.
- `useReducedMotion`: one shared reactive preference.
- `Reveal`: intersection-based entrance with no subtree-wide MutationObserver per animation type.
- `ParallaxLayer`: reads one shared passive scroll/RAF store.
- `ScrollProgress`: normalized section progress.
- `MotionToggle`: explicit site-wide motion control.
- `AutoplayController`: pause on user request, hover, focus, hidden tab, and reduced motion.

Use CSS/Web Animations/IntersectionObserver first. Use CSS scroll-driven animation only as progressive enhancement with a static/rAF fallback.

Preference precedence is deterministic: the OS reduced-motion preference is the safety cap; an explicit user choice to reduce/disable motion overrides Site defaults; Site defaults apply only when the user has not chosen. Server rendering starts from a safe non-moving state so hydration never produces a motion flash.

### 7.2 Motion tokens

| Category | Typical duration | Purpose                                |
| -------- | ---------------: | -------------------------------------- |
| Instant  |          0–80 ms | State correction, no decorative travel |
| Fast     |           160 ms | Hover/focus/pressed feedback           |
| Base     |           240 ms | Menus, tabs, compact state changes     |
| Reveal   |       500–700 ms | Section/content entrance               |
| Hero     |       800–900 ms | Major narrative transition             |

Productive easing: `cubic-bezier(.2,.8,.2,1)`
Expressive easing: `cubic-bezier(.16,1,.3,1)`

### 7.3 Parallax rules

- Required locations: hero artwork, five-pillar showcase, and selected case-study media.
- Hero decorative background depth: approximately `0.12–0.18`.
- Technical foreground depth: approximately `0.04–0.08`.
- Typical travel: 8–40 px; sticky narrative may use up to 72 px after device testing.
- Only `transform` and `opacity` are animated.
- One shared RAF loop; components must not attach uncontrolled scroll handlers.
- Pause when the document is hidden and when the section is outside the active range.
- Disable on reduced motion. Simplify or disable on low-capability/mobile devices if profiling shows jank.
- Pointer-depth and magnetic behavior is allowed only for `hover: hover` and `pointer: fine` devices.
- No motion may move a focused control away from the user.

### 7.4 Five-slide hero behavior

Exactly five slides load from the canonical pillar source, in canonical order. Each includes:

- Pillar key and label.
- Humanized headline and short client outcome.
- Two proof/capability points.
- Primary and secondary CTA.
- Generated non-human visual File reference and alt text.
- Required lightweight code-owned fallback visual key for Site/storage/DB failure.
- Accent token and sequence.
- Draft/publish/enable state.

Interaction requirements:

- Only the active image has high loading priority; prefetch at most the next image during idle time.
- Direct labelled controls, previous/next, keyboard arrows, and pointer/touch swipe.
- Visible pause/play when autoplay is enabled.
- Pause on hover, keyboard focus, hidden tab, and user interaction.
- Autoplay interval is at least six seconds; a user pause persists for the browser session.
- Reduced motion disables autoplay and animated spatial transitions.
- Screen readers receive meaningful current slide/position information without noisy automatic announcements.
- Layout dimensions remain stable through every transition.

### 7.5 Motion acceptance gate

- The baseline ADR names a physical mid-tier Android/browser or pins an equivalent browser emulation and a repeatable 10-second scripted scroll.
- Desktop target: p95 rendered-frame time ≤ 16.7 ms during the scripted narrative.
- Mid-tier mobile target: p95 rendered-frame time ≤ 22 ms, at most two motion-attributable tasks over 50 ms during the script, and none over 100 ms. Any exception requires a captured trace and documented reduced motion/tier adjustment.
- No layout shift from reveals or parallax.
- Continuous marquee, float, magnetic, count-up, and autoplay stop or become static under reduced motion.
- Automatic motion complies with pause/stop/hide requirements.
- Visual regression uses deterministic states: hero slides 1–5 and scroll progress 0, 0.5, and 1 rather than live timers.

## 8. Generated media system

### 8.1 Art direction

Use a coherent technical-editorial language:

- Dark graphite and soft ivory base.
- Restrained spectral pillar accent.
- Cinematic depth, precise geometry, systems and flows.
- No people, faces, robots, stock keyboards, generic glowing brains, logos, or fake UI text.
- Leave intentional low-detail copy-safe areas.
- Use code-native overlays/grids for depth rather than stacking multiple heavy raster images.

### 8.2 Required generated set

| Asset family      | Minimum deliverables                                                |
| ----------------- | ------------------------------------------------------------------- |
| Hero              | Five 2400×1350 masters plus mobile-aware crops, one per pillar      |
| About identity    | One abstract 4:5 five-capability identity visual                    |
| Project fallbacks | Five 4:3 pillar-specific covers                                     |
| Article fallbacks | Five 16:10 pillar-specific editorial covers                         |
| Social            | One 1200×630 base system for dynamic OG rendering                   |
| Contact           | One subtle wide interface/bridge visual if the composition needs it |

### 8.3 Media pipeline

1. Approve one visual-direction board and prompt grammar.
2. Generate and approve one pillar pilot at desktop/mobile crops and both themes before batch generation.
3. Review composition at desktop/mobile crops and both themes.
4. Export AVIF/WebP derivatives with bounded dimensions and file sizes.
5. Ingest through the provider-neutral managed-media path used by File API/storage middleware and trusted media scripts.
6. Store alt text, dimensions, focal point, dominant color, blur placeholder, origin, generation prompt/version, attribution/license, and checksum where available.
7. Reference File ObjectIds from Site/Pillar/Project/Article records.
8. Commit a provider-neutral provenance/checksum manifest so managed database/provider mutations remain reproducible across small Git commits.

No public component calls Cloudinary/GCP directly. No new Unsplash dependency remains after migration.

### 8.4 Deterministic fallbacks

- Missing project/article media selects a pillar-specific visual, not a broken or generic path.
- Missing author/portrait uses an abstract brand mark, never a fake person.
- Empty states use lightweight code-native SVG/CSS diagrams.
- A minimal code-owned visual remains available when the database or storage provider is unavailable; managed fallback Files enhance it rather than replace the emergency layer.
- An image load error swaps to the correct fallback once and cannot loop.
- Informative media gets purposeful alt text; decorative hero atmosphere uses empty alt text when the adjacent slide copy already provides the meaning.

### 8.5 Media budgets

- Mobile hero target: ≤ 200 KB.
- Desktop hero target: ≤ 350 KB.
- One above-the-fold priority image.
- Explicit aspect ratio/dimensions and responsive `sizes` for every content image.
- Below-fold media lazy-loads.

## 9. Dynamic content architecture

### 9.1 Site singleton

Add a typed `Site` module using the existing model/repository/service/controller/route structure.

Core fields:

- `site_key: "primary"` with a unique index.
- Identity: full name, short name, canonical URL, locale, timezone.
- Positioning: canonical five-pillar line plus approved compact/mobile and long variants, short bio, long bio, client promise.
- Exactly five typed pillar entries with unique keys and fixed sequence.
- Brand: light/dark logos, favicon, abstract profile media, resume File.
- Contact: email, optional phone, location, availability, response promise, map policy.
- Ordered navigation, social links, primary CTAs, footer, and legal links.
- SEO defaults, default OG File, robots/indexing defaults, verification fields.
- Theme/motion defaults and constrained feature flags.
- Default project/article/profile fallback File references.
- Verified/derived metrics configuration.
- Draft snapshot, published snapshot, revision number, publisher, and publish timestamp.

Public reads return only the published DTO. Publish uses a conditional atomic revision update, validates the complete reference graph, and returns `409 Conflict` for stale revisions.

### 9.2 Expertise pillars

Embed the five canonical pillars inside Site so they publish atomically. Projects, articles, services, and skills reference the stable pillar enum key rather than a Pillar ObjectId. Each pillar owns its single hero presentation; there is no second editable HeroSlide collection.

- Exactly five unique keys.
- Stable order and labels.
- Per-pillar hero copy, visual, capabilities, technologies, CTA, accent, and SEO summary.
- Relationships to projects, articles, services, and skills.
- No public state with fewer or more than five enabled hero pillars.
- Draft editing may temporarily disable/incomplete a pillar, but publish atomically requires all five enabled, complete, and in canonical order.

### 9.3 Page composition

Add a typed Page module for the fixed, implemented route allowlist (`home`, `about`, `projects`, `articles`, `contact`, `privacy`, and `terms`), keyed by stable page key/locale:

- Route/page key, title, description, status, SEO overrides.
- Ordered sections selected from an allowlisted registry.
- Zod discriminated union for section data.
- Draft/published layout revisions and a short-lived scoped preview session in an httpOnly cookie.
- Section visibility, sequence, item limits, and curated/automatic source mode.

Allowed section types include hero, profile, pillars, services, process, metrics, skills, projects, articles, testimonials, FAQ, timeline, credentials, CTA, contact, and optional map. Page snapshots store order/layout/reference configuration, not duplicated content bodies. Arbitrary routes, component paths, scripts, and unrestricted HTML are prohibited.

### 9.4 Repeatable modules

Create typed repeatable modules only where content has an independent lifecycle, query need, moderation need, or reuse:

- Services.
- Skill groups/tools.
- Timeline entries: experience and education.
- Credentials: certification, course, award.
- FAQs.
- Testimonials/endorsements.
- Legal documents.

Low-volume navigation, social links, footer, process steps, and metric configuration remain typed embedded Site/Page content instead of receiving separate CRUD stacks.

Common fields:

- Stable key/slug and locale.
- Title, structured copy, optional icon allowlist, File references.
- Sequence, status, featured/enabled state.
- Verification state where factual claims are involved.
- Creator/updater, timestamps, soft-delete fields.
- Record modules use ordinary status, `published_at`, optimistic version checks, and AuditEvent history. Site/Page alone use draft/published snapshots; small modules do not each receive a revision subsystem.
- Purpose-built compound indexes, bounded cursor/page queries, and explain-plan budgets for admin/public query shapes.

### 9.5 Project and article evolution

Project additions:

- Collision-safe slug and redirects.
- Slug history for later title/slug changes, not only the first legacy ID redirect.
- Primary pillar and optional secondary pillars.
- Project type, role, client visibility, technologies.
- Separate delivery lifecycle (`planned`/`active`/`completed`) from editorial publication (`draft`/`published`/`archived`), so an honest ongoing project may be public.
- Challenge, constraints, solution, architecture, contribution.
- Security/reliability/performance decisions.
- Outcome metrics with verification state.
- Live/source URLs with visibility and URL allowlisting.
- SEO, gallery ordering/captions, related records.

Article additions:

- Collision-safe slug and redirects.
- Primary pillar/topics, reading time, excerpt.
- Optional explicit expiry; no automatic 24-hour expiry.
- Structured/sanitized body, TOC metadata, SEO, related records.
- Published/updated timestamps and canonical behavior.

### 9.6 File module evolution

- Extend reference model enums for every new content model.
- Add `alt_text`, focal point, dominant color, blur placeholder, width/height guarantees, source (`uploaded`/`generated`), generation provenance, attribution/license, checksum, and purpose.
- Extract a provider-neutral `ManagedMediaService` used by storage middleware/File API and trusted scripts.
- Validate signatures through a maintained parser, accepted purpose/type combinations, dimensions, file sizes, SVG policy, access class, readiness, and ownership; do not hand-roll file-format security.
- Use staged upload → database transaction → post-commit finalization with idempotent compensation. Mongo transactions cover database records, not Cloudinary/GCP.
- Track `uploading`, `ready`, `orphaned`, `deleting`, and `error` lifecycle states; private delivery uses short-lived URLs that are never persisted.
- Keep permanent deletion provider-aware using the provider stored on each File.

### 9.7 Public/admin API boundaries

Public:

- `GET /api/site` returns the published Site DTO.
- `GET /api/pages/[slug]` returns a published typed page DTO.
- Public project/article/supporting endpoints return published/active/approved projections only.
- Homepage uses a server-side `getHomePagePayload()` to avoid waterfalls and inconsistent filters.

Admin:

- `GET/PATCH /api/site/admin`.
- `POST /api/site/admin/publish`.
- Private preview route/session.
- Typed CRUD, reorder, archive, restore, publish, and bulk routes for repeatable modules.
- `GET /api/admin/dashboard` returns real aggregates and health data.

Every route has Zod validation for body/query/params, explicit max limits, DTO projection, authorization close to the data source, and consistent errors.

### 9.8 Cache and rendering

- Public content uses tagged caching such as `site`, `page:{slug}`, `projects`, `project:{slug}`, `articles`, `article:{slug}`, `skills`, and `services`.
- The Next.js 16 cache ADR explicitly chooses `unstable_cache` or deliberately enables Cache Components, defines bounded tag names, and uses route-handler-compatible `revalidateTag(tag, "max")`/path semantics. `updateTag` is reserved for Server Actions.
- Publishing invalidates only after database commit; invalidation failure is logged/retried without rolling back valid content.
- Draft/admin/preview requests are always `no-store`.
- Remove unconditional `force-dynamic` from Home when the published payload can be cached safely.
- Render initial public list and above-fold content on the server.
- Client state enhances filters and interactions; it does not gate primary content.

## 10. Admin product plan

### 10.1 Security foundation

- Protect admin route segments on the server using a centralized session/DAL check.
- Keep authorization checks inside every mutation/API as well.
- Return minimal user DTOs and permission capabilities.
- Refresh/expire sessions predictably; logout must clear cookies and client state.
- Admin/auth routes are `noindex`.

### 10.2 Information architecture

- Overview.
- Site & Brand.
- Pages/Home.
- Projects and project resources.
- Articles.
- Expertise: pillars, services, skills, process.
- Profile: experience, education, credentials.
- Trust: testimonials, reviews, metrics, FAQs.
- Inbox: contacts.
- Media library.
- Taxonomy: project/article categories.
- Users and roles, visible only to authorized roles.
- System: audit log, health, settings.

Every sidebar destination must exist and work. Remove speculative navigation until its page is implemented.

### 10.3 Admin shell

- Responsive persistent shell with accessible desktop collapse and focus-trapped mobile drawer.
- Real signed-in user, role, session actions, breadcrumbs, page title, and environment indicator.
- Working logout.
- Notifications only if backed by real data; otherwise remove the bell.
- Keyboard-accessible command/search may be added after core workflows are stable.

### 10.4 Editorial workflows

- Draft/save/publish/archive states.
- Clear dirty-state/unsaved-change guard.
- Preview public rendering before publish.
- Optimistic concurrency conflict UI.
- Reorder controls with keyboard-accessible alternatives.
- SEO/social preview, slug control, media picker, alt/focal fields.
- Content completeness and verification checklist.
- Bulk actions through the custom DataTable.
- Destructive actions require scoped confirmation and show partial-failure results.

### 10.5 Real dashboard

- Published/draft totals from the database.
- Content completeness and five-pillar coverage.
- Recent inquiries and inbox state.
- Recent publishes/edits from audit data.
- Storage provider status and usage summaries.
- Broken/missing media or external-link warnings.
- No fake metrics, activity, or notifications.

## 11. Seed, migration, and content population

### 11.1 Migration registry

- Add ordered, idempotent migration records with version/checksum/status/timestamps.
- Back up before destructive schema changes.
- Support dry-run reporting where practical.
- Fix soft-delete/public projection behavior before importing new content.
- Backfill collision-safe project/article slugs and legacy redirects.
- Align frontend/backend contracts before new admin forms depend on them.
- Add the minimal redacted AuditEvent domain before any new publishable module writes audit records.
- Stage slug migrations as optional field → backfill → partial unique index → dual ID/slug readers → canonical switch → later required validation.

### 11.2 Seed commands

- `pnpm seed`: non-destructive stable-key upsert.
- `pnpm seed:dry-run`: report intended changes.
- `pnpm seed:demo`: development/test demo content only.
- `pnpm seed:reset`: explicitly destructive and unconditionally disabled in production.
- Seed version/checksum tracking.
- Per-record `seed_key`, `seed_version`, and `last_seed_hash`; update only when the record still matches the prior seed hash unless an explicit non-production force option is used.
- Preserve admin edits unless an explicit safe force option is used.

Dependency order:

1. Super admin.
2. Managed File/media records.
3. Site singleton and five pillars.
4. Categories.
5. Repeatable profile/content modules.
6. Projects/resources.
7. Articles.
8. Pages and section references.

### 11.3 Content volume target

The following is an aspirational coverage target, not an instruction to manufacture records. Production seeds contain only verified material that actually exists; a smaller set of excellent records is preferable to fabricated coverage. Demo/development fixtures may meet the full volume while remaining unpublishable in production.

- One complete Site record.
- Exactly five pillars and hero slides.
- Five to seven services.
- Fifteen to twenty skills grouped by pillar.
- Six process steps.
- Four honest/derived metrics or fewer if proof is unavailable.
- Verified experience, education, and credential entries.
- Six to eight useful FAQs.
- Up to ten substantial verified projects/labs, aiming for two primary-pillar examples where real material exists.
- Up to ten to fifteen substantial verified articles, aiming for two primary-pillar examples where real material exists.
- Testimonials only when verified and consented.

Development/demo records are labeled and cannot be published to production by default. If factual production content is not yet available, the public fallback favors capabilities, labs, process, and contact—not fake client proof.

## 12. Fallback and state matrix

Every dynamic surface implements all relevant states:

| Condition                        | Public behavior                                                               | Admin behavior                                |
| -------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| Loading                          | Fixed-size contextual skeleton; no layout jump                                | Skeleton/table pending state                  |
| Empty, valid                     | Honest, useful empty state and next CTA                                       | Create/import guidance                        |
| Request error                    | Inline explanation, retry, framework-cached published response when available | Detailed actionable error with correlation ID |
| Missing media                    | Pillar-based deterministic fallback                                           | Missing-media warning and picker              |
| Broken media URL                 | One safe fallback swap                                                        | Health issue surfaced                         |
| Missing optional field           | Hide dependent UI cleanly                                                     | Completeness hint                             |
| Missing required published field | Block publish                                                                 | Field-level error                             |
| Missing detail record            | Real 404/not-found                                                            | Admin record-missing state                    |
| Stale revision                   | Continue showing published version                                            | `409` conflict resolution UI                  |
| Provider outage                  | Existing public URLs continue where possible                                  | Upload retry/provider health notice           |
| No verified testimonials         | Show proof/case-study alternative                                             | Verification queue                            |
| Reduced motion                   | Static/opacity-only experience                                                | Same content and controls                     |

No API/DB error may silently resemble “zero content.”

## 13. Performance and rendering plan

### 13.1 Measurable targets

Pre-launch lab gates use the pinned Lighthouse/Chrome version, device/network/CPU profile, production-like seed, route set, and warm/cold cache state captured in the baseline ADR. Scores use the median of three runs:

- Lighthouse Performance ≥ 90 on Home, About, Projects, Articles, and one detail page.
- Public HTML TTFB target ≤ 800 ms.
- Public initial route JS target ≤ 180 KB gzip.
- Third-party JS target ≤ 60 KB gzip.
- Mobile hero ≤ 200 KB; desktop hero ≤ 350 KB.
- No initial request for all five hero images.

Post-launch field objectives are p75 LCP ≤ 2.5 s, INP ≤ 200 ms, and CLS ≤ 0.10. A route cohort is reported only after at least 200 eligible RUM samples across a rolling 28-day window; otherwise it is “insufficient data,” not a pass or fail.

### 13.2 Implementation strategy

- Prefer Server Components for content and layout.
- Isolate small interactive client islands.
- Remove unnecessary `"use client"` boundaries after measuring.
- Use `next/image` with dimensions, `sizes`, priority only for the active LCP image, and safe remote path restrictions.
- Self-host fonts and subset weights/scripts.
- Use tagged cache/revalidation rather than per-request homepage DB reads.
- Delay GitHub activity, maps, and non-critical embeds.
- Avoid large blur filters and full-screen continuously composited layers.
- Measure emitted chunks and route transfer; remove unused dependencies and duplicated detail components.
- Preserve stale published content during transient backend failures where safe.

## 14. Accessibility plan

Target WCAG 2.2 AA, with the motion protections of WCAG 2.3.3 treated as a product requirement.

- Skip link, semantic landmarks, one meaningful H1, and logical heading order.
- Keyboard access and visible focus for navigation, slider, filters, drawers, dialogs, editors, uploaders, and tables.
- No nested interactive controls.
- Accessible names for icon buttons/social links.
- Form `label`/`id`, descriptions, field errors, summary, and live submission status.
- Touch targets at least 44×44 CSS px.
- Contrast: 4.5:1 normal text; 3:1 large text and necessary UI boundaries.
- Mobile menu/dialog focus trap, Escape close, and focus restoration.
- Hero/carousel pause and labelled slide navigation.
- Reduced-motion support across autoplay, parallax, marquee, reveal, magnetic, and count-up behavior.
- Correct table semantics and bulk selection announcements.
- Meaningful alt text/captions; decorative media has empty alt.
- Automated axe has zero critical/serious findings; Lighthouse Accessibility target ≥ 95.
- Manual keyboard and screen-reader smoke tests remain mandatory.
- Browser matrix: the latest two stable desktop Chrome, Firefox, Safari, and Edge releases plus current/previous-major iOS Safari and current Android Chrome, refined by real analytics after launch.
- Reflow includes safe-area insets, mobile browser chrome, `100dvh` behavior, 200%/400% zoom, and no horizontal overflow.

## 15. SEO and discoverability plan

- Central `metadataBase`, title template, canonical URL builder, and Site-derived defaults.
- Unique title/description/canonical/OG/Twitter metadata for every indexable route.
- Dynamic 1200×630 Open Graph images for projects/articles and a valid default.
- `robots.ts`, `sitemap.ts`, manifest, favicon/icon/apple-icon set.
- Admin, preview, and sign-in routes `noindex`.
- Slug canonical URLs and permanent redirects from legacy IDs.
- Real 404 response for missing content.
- Initial grids in server HTML.
- Structured data only when accurate and visibly supported: `Person`, `WebSite`, `ProfessionalService`, `BreadcrumbList`, `Article`, and `CreativeWork`; FAQ markup only where current search guidance and visible content justify it.
- Article/project author, publish/update time, image, and breadcrumbs remain consistent between UI and schema.
- Optional RSS/Atom feed after the article foundation is stable.

## 16. Security and privacy plan

- Central session verification/Data Access Layer close to protected data access.
- Role/capability checks on pages, APIs, server actions, and mutations.
- Explicit public DTOs; never serialize administrative model shapes directly.
- Server-side rich content sanitization or allowlisted structured blocks.
- URL protocol/domain policy for external resources.
- Distributed rate limits for sign-in, refresh, contact, reviews, and uploads; in-process memory is not the production authority in a multi-instance/serverless deployment.
- CSRF/fetch-metadata/origin controls for cookie-authenticated state changes.
- Honeypot and safe email templating for contact submissions.
- Strict input size limits and consistent Zod validation.
- NoSQL operator rejection, strict ObjectId parsing, bounded arrays/rich text, and safe query allowlists.
- File signature, dimension, purpose, SVG, and ownership rules.
- Transactional content/File-reference changes or tested compensation.
- CSP introduced in report-only mode, then enforced after violations are resolved.
- Security headers: frame ancestors, content type, referrer, permissions, and HSTS at the deployment layer where appropriate.
- Secrets remain environment-only; Site settings never expose them.
- Audit log for publish, role, delete/restore, and sensitive setting changes.
- Scoped preview sessions use short-lived httpOnly cookies, not tokens exposed in URLs/logs/referrers.
- Any external-link health checker blocks private/link-local targets, unsafe redirects/protocols, oversized responses, and long timeouts to prevent SSRF.
- Contact PII has a documented retention window, export/access process, deletion/anonymization path, and scheduled purge behavior.
- Privacy-safe analytics; never capture contact message content or sensitive form fields.

## 17. Testing and release quality

### 17.1 Tooling decision

No runtime UI dependency is needed for quality automation. Before installation, record approval for the smallest dev-only stack capable of:

- Unit/domain tests.
- Component interaction tests.
- Browser end-to-end tests.
- Accessibility checks.
- Lighthouse and visual regression.

Preferred direction is a focused Vitest/Testing Library/Playwright/axe/Lighthouse CI stack, but the dependency decision is a named task and not silently bundled into feature work.

### 17.2 Required coverage

- Unit: public visibility, fallback selection, site revision/publish rules, slugging, query state, metadata builders, reduced-motion/parallax math.
- Component: five-slide hero, pause/reduced motion, media fallback, contact states, mobile navigation focus, admin publish forms.
- Integration: Site draft/publish, media references, contact submission, public projections, cache invalidation, restore/permanent deletion.
- E2E public: navigation, filters/search, details, share, contact, reduced motion.
- E2E admin: sign-in, permissions, edit/preview/publish, media, inbox, logout.
- Visual: key pages at 360/768/1280/1536, light/dark, normal/reduced motion.
- Core/domain coverage target ≥ 80%. Regardless of percentage, explicit scenario matrices must cover every public visibility status, authorization role/capability, publish/conflict state, contact abuse/delivery state, and fallback/provider failure branch.

### 17.3 Release gate

Every milestone must pass relevant tests plus:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Final release additionally requires no broken links/assets, no critical/serious accessibility findings, no known public-data leaks, validated metadata/schema, performance targets or documented exceptions, and a rollback/backup plan.

## 18. Observability and operations

- Capture LCP/INP/CLS by route, device class, and release.
- Structured server logs with request/correlation IDs and redaction.
- Client/server exception tracking with source maps.
- API latency/error rate and database query timing.
- Contact delivery and upload-provider failure monitoring.
- Synthetic checks for Home, representative details, sign-in, and contact.
- Content/media health job for broken external URLs, missing files, and incomplete alt text.
- Post-launch objectives: 99.9% availability, public API p95 ≤ 400 ms, and server error rate < 1%. Before enforcement, the operations ADR defines a rolling 30-day window, valid-request denominator, route classes, deployment region, warm/cold split, and concurrency profile.
- Define retention and privacy policies before analytics/error tooling goes live.

## 19. Delivery phases

### Phase 0 — Integrity and decision lock

Fix security/public projection/contact/article-expiry/contract issues; capture truthful content inventory; approve canonical positioning, creative brief/forbidden motifs, dependency policy, test foundation, and measurable pre-redesign baselines. Final visual prototypes are approved in Phase 4.

### Phase 1 — Product foundations

Build tokens, typography, layout primitives, accessible component states, motion infrastructure, reveal/parallax primitives, route fallbacks, and browser-quality automation. This phase builds primitives; it does not claim the final narrative integrations.

### Phase 2 — Dynamic architecture

Add migration runner, Site/Page/content modules, File metadata evolution, draft/publish/preview, safe public DTOs, caching, and idempotent seed infrastructure.

After Phase 0, Phase 1 UI foundations and Phase 2 backend foundations may run as parallel dependency lanes. Cross-domain integration still waits for both lanes.

### Phase 3 — Admin content operating system

Secure the admin routes and rebuild the shell, real dashboard, Site editor, repeatable content workspaces, media library, inbox, taxonomy, and publish workflows using custom UI/DataTable components.

### Phase 4 — Media and public shell

Prototype, approve, generate, and ingest the visual system; rebuild header/footer; implement the accessible five-slide hero; and integrate the already-built motion/parallax infrastructure into real narratives.

### Phase 5 — Proof-driven public pages

Recompose Home, About, Projects, Articles, Contact, and Legal pages around real dynamic content, case studies, safe editorial rendering, URL-backed discovery, and complete fallback states.

### Phase 6 — Hardening and launch

Complete accessibility, security, SEO, performance, browser/device, visual regression, observability, content verification, backup, and production launch checks.

## 20. Commit and execution policy

- Implement tasks in dependency order from `tasks.md`.
- One logical concern per commit; avoid giant “redesign everything” commits.
- Do not mix unrelated cleanup with a milestone.
- Before each commit: inspect the diff, confirm no unrelated user changes are included, run proportional verification, and update task status.
- Use imperative, outcome-oriented commit messages.
- Never commit secrets, generated credentials, local databases, build artifacts, or unverified production claims.
- Never commit private evidence worksheets, consent proofs, confidential client details, or contact PII. Only redacted schemas and approved public manifests belong in Git.
- Keep migrations backward-compatible until all readers are switched; remove legacy code only in a later explicit commit.

## 21. Definition of done

The transformation is complete only when:

- Exactly five canonical pillars drive hero, About, capabilities, filters, metadata, footer, admin preview, and seeds.
- The hero has five accessible slides with coherent non-human generated media.
- Meaningful parallax exists in required narratives and fully respects reduced motion.
- Public content is dynamic, cached, truthfully populated, and resilient across loading/empty/error/missing-media states.
- Admin securely manages Site, pages, core content, media, projects, articles, inbox, taxonomy, and user-visible settings.
- Every admin navigation item works and dashboard data is real.
- Contact, logout, external project links, share, preview, and publish work end to end.
- Public DTOs cannot expose drafts, private resources, pending reviews, user emails, or admin fields.
- Rich content is structurally safe/sanitized.
- All media uses the File/storage abstraction and optimized rendering.
- Seed/migration processes are idempotent, guarded, and documented.
- Accessibility, SEO, security, performance, tests, observability, and release gates are satisfied or have explicit accepted exceptions.
- The final content sounds human, professional, consistent, and credible to clients and technical reviewers.

## 22. Primary reference standards

- [Next.js 16 authentication and authorization guidance](https://nextjs.org/docs/app/guides/authentication)
- [Next.js image optimization](https://nextjs.org/docs/app/getting-started/images)
- [Next.js metadata and Open Graph images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js cache revalidation](https://nextjs.org/docs/app/getting-started/revalidating)
- [WCAG 2.2 — Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)
- [WCAG 2.2 — Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)
- [MDN — `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## 23. Open inputs that do not block engineering foundations

These inputs are collected before their dependent content is published, but they do not block P0/foundation work:

- Verified employment, education, credentials, project/client facts, and numerical outcomes.
- Which real portrait, if any, Foysal wants to keep.
- Resume source/file and preferred public contact details.
- Verified testimonial consent/evidence.
- Live/source URL visibility per project.
- Preferred analytics/error-monitoring provider and privacy policy.
- Production storage credentials and deployment environment details.

Until verified, the system uses honest draft/demo states and professional fallbacks.
