# Published Page resolver

The published Page resolver is the server-only composition boundary between fixed-route Page snapshots and public rendering. `getPublishedPagePayload(routeKey)` resolves any allowlisted route, while `getHomePagePayload()` is the typed Home facade reserved for the later public renderer work.

This phase does not change the current Home UI and intentionally leaves Home's `force-dynamic` behavior in place. Renderer parity and route-level caching are P14 responsibilities.

## Trust and data boundary

The resolver reads only `Page.published`; draft content, editor identity, revision bookkeeping, preview state, and admin fields are never copied into its payload. A missing published snapshot fails closed with `PAGE_NOT_PUBLISHED`.

Collection sections delegate to domain-owned public readers:

- Project and Article readers enforce published visibility, exact active soft-delete scope, active category and author relations, minimal list projections, and their existing public DTO redaction.
- Service, SkillGroup, Skill, TimelineEntry, Credential, FAQ, Testimonial, and LegalDocument readers enforce the repeatable domain's published/enabled/scheduled/trust policy and serialize through its explicit `to_public_dto` allowlist. A SkillGroup composition item embeds only trust-eligible public Skill DTOs from one bounded relation query; groups without an eligible Skill are omitted.
- System sections use the public Site DTO only.

Curated object IDs are lookup inputs, not output fields. Missing, draft, private, future, expired, trust-ineligible, relation-ineligible, or deleted records are omitted. Curated results retain the configured ID order; automatic results retain the domain's deterministic public sort.

## Payload and health

The payload contains published Page metadata, the public Site DTO, ordered visible sections, resolved public items, and machine-readable health. Section health is one of:

- `healthy`: the source resolved fully;
- `empty`: an automatic optional source validly returned no records;
- `partial`: some curated records were omitted, or a system section is using the emergency Site fallback;
- `unavailable`: a curated source resolved nothing or a supporting reader failed.

Reason codes are bounded and redacted: `site_emergency_fallback`, `source_empty`, `source_unavailable`, and `curated_reference_omitted`. Database/framework exception text is never exposed. A supporting collection failure degrades only that optional section; it does not discard the valid Page, Site, or sibling sections.

## Query and record budgets

- at most 20 visible section reads;
- at most 4 collection reads in flight;
- at most 24 records per collection section;
- at most 24 related Skills across one SkillGroup section;
- at most 480 resolved primary records per Page;
- a hard resolver-side slice protects the budget even if a supporting reader over-returns;
- all readers use deterministic limits, minimal projections, and indexed public visibility predicates.

The Page and Site reads begin in parallel. Collection reads then use a bounded worker pool and store results by original section index, so concurrency cannot reorder the Page.

## Cache and invalidation

The server-only payload cache has a one-hour safety TTL and a bounded tag set covering:

- global and route-specific Page tags;
- Site;
- Article and Project;
- Service, SkillGroup, Skill, TimelineEntry, Credential, FAQ, Testimonial, and LegalDocument.

Page and Site publication continue using their transactionally recorded invalidation intents. Repeatable content uses its existing domain cache tag and retry intent, which also invalidates the composed payload because the outer cache shares that tag.

Article and Project mutations now create a domain-tagged invalidation intent after the database mutation commits. Successful delivery uses `revalidateTag(tag, "max")`; framework failure leaves the intent pending with a bounded retry time. `retryPendingPublicContentInvalidations()` processes at most 25 intents per call and records only stable error codes. Delivered intents expire after seven days.

Migration `202607150014-public-content-cache-invalidation` creates the unique event, pending-delivery, and delivered-retention indexes non-destructively. Existing malformed or duplicate intent records require explicit remediation.

Admin, draft, and preview readers remain separate private `no-store` surfaces and are never called by this resolver.
