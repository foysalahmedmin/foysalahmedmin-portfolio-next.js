# Generated media direction and production manifest

This document locks the pre-generation visual contract for P12. It is a
provider-neutral production manifest, not evidence that an asset exists or has
been approved. At this revision no image bytes have been generated, ingested,
attached, or published; every checksum and File ID must remain unset until the
corresponding operation succeeds.

| Contract                | Value                                         |
| ----------------------- | --------------------------------------------- |
| Direction               | `architected-intelligence`                    |
| Prompt contract         | `architected-intelligence/1.0.0`              |
| Manifest contract       | `portfolio-generated-media/1.0.0`             |
| Required source masters | 17                                            |
| Hero mobile QA crops    | 5 derivatives, not additional masters         |
| Optional Contact visual | Deferred and outside the 17-master commitment |

The canonical pillar order and semantic accent tokens come from
`src/lib/content/pillars.ts` and `src/assets/styles/base/variables.css`. Exact
colors must be sampled from those tokens at generation time; a prompt must not
replace them with an independently chosen palette.

## Direction decision

Three textual candidate briefs establish the comparison rubric for future
visual direction boards. The desk assessment below supports a prompt-contract
decision; it is not evidence that visual boards were produced or formally
evaluated, and it is not a generated-media approval.

| Board                        | Visual language                                                                                                                                | Copy-safe area                                                          | Pillar differentiation                                                                | Theme compatibility                                          | Crop resilience                                                               | Originality and risk                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Architected Intelligence** | Precise system geometry, layered translucent planes, controlled paths, cinematic depth, warm ivory/graphite base, one restrained pillar accent | Strong: a deliberately quiet left field and a right-biased focal system | Strong: each pillar owns a different topology while materials and lighting stay fixed | Strong: neutral surfaces survive both theme overlays         | Strong: the topology has a compact focal core and expendable peripheral paths | Authored technical-editorial character; risk of generic diagrams is controlled by the topology grammar |
| Material Systems Lab         | Macro engineered materials, physical layers, joints, and light wells                                                                           | Adequate, but macro forms can dominate copy                             | Moderate: material changes can become arbitrary rather than semantic                  | Strong                                                       | Strong                                                                        | Distinctive but can read as luxury-product imagery rather than engineering practice                    |
| Signal Cartography           | Dense routes, traces, fields, and network maps                                                                                                 | Weak to moderate                                                        | Strong                                                                                | Moderate: emissive lines can become neon-heavy in dark theme | Moderate: dense routes lose hierarchy in narrow crops                         | Technically expressive but closest to familiar developer-network imagery                               |

**Selected direction: Architected Intelligence.** It best preserves editorial
clarity while giving each pillar a recognizable system topology. The shared
materials, lens, depth, background, and lighting create one family; only the
topology, semantic accent, and bounded composition vary. This decision does not
approve a generated pilot or prove that the direction works in final pixels.

### Fixed visual kernel

- Warm ivory and graphite neutral surfaces with one restrained semantic pillar
  accent; no rainbow treatment.
- Precise geometry, physically plausible depth, subtle translucency, fine
  structural detail, and controlled cinematic light.
- One compact focal system in the right 35–40% of a hero master. The left
  55–60% remains low-detail and low-contrast for live copy.
- Meaning comes from topology and relationships, not text, icons, brands, or
  literal objects.
- Background edges remain quiet enough to blend beneath the existing theme
  gradients. Important geometry must not touch an edge.
- Grain, bloom, glow, and particles are restrained; the result must still read
  as an editorial image when motion and parallax are disabled.

### Pillar topology vocabulary

| Pillar                 | Required topology                                                                                                                                | Differentiator                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Frontend Engineering   | A modular presentation plane assembled from nested frames, layout constraints, and a clear interaction path                                      | Fine alignment, responsive reflow, and compositional rhythm—not a screenshot or browser UI  |
| Backend Engineering    | A resilient service-and-data path with queues, bounded processing nodes, and durable storage layers                                              | Directional throughput and controlled fan-out—not server-rack stock imagery                 |
| AI Automation          | A tool-orchestration loop with branching decisions, feedback, and a visible human-governance boundary represented only as an abstract constraint | Adaptive routing and review loops—not a brain, robot, face, or chatbot UI                   |
| System Design          | A fault-aware topology with boundaries, redundancy, observability paths, and graceful alternate routes                                           | Architecture-level relationships and failure isolation—not a literal cloud-provider diagram |
| Full-Stack Development | An integrated vertical system connecting presentation, application, data, automation, and operations without collapsing them into one object     | End-to-end continuity and clear layer hand-offs—not a collage of the other four images      |

## Locked prompt grammar

Every generation request must be assembled in this order. The exact effective
positive and negative text sent to the generator is stored verbatim in
`provenance.prompt`; do not store only a paraphrase or this template.

```text
PROMPT_CONTRACT: architected-intelligence/1.0.0

Create a non-human technical-editorial image in the Architected Intelligence
visual language: warm ivory and graphite neutral surfaces, precise engineered
geometry, layered translucent planes, physically plausible cinematic depth,
restrained light, fine structural detail, and one semantic pillar accent sampled
from [PILLAR_ACCENT_TOKEN].

ASSET ROLE: [ASSET_ROLE_AND_ASPECT].
SYSTEM TOPOLOGY: [PILLAR_OR_FIVE_PILLAR_TOPOLOGY].
COMPOSITION: [COPY_SAFE_AND_FOCAL_RULE].
RENDER INTENT: authored editorial artwork, coherent at thumbnail size, clean
silhouette, bounded contrast, quiet edges, no meaning dependent on animation.

NEGATIVE CONSTRAINTS: [LOCKED_NEGATIVE_PROMPT].
```

Only four slots may vary: asset role/aspect, topology, semantic accent token,
and the composition/focal rule. The fixed visual kernel and negative prompt do
not drift between assets. Generator-specific quality flags may be appended only
after the effective prompt and must be captured in provenance.

### Asset-role clauses

| Role                | Clause                                                                                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hero master         | `2400x1350 landscape atmosphere; quiet left 58%; compact focal topology centered near normalized (0.72, 0.50); preserve a coherent 4:5 crop around the focal core` |
| About identity      | `1600x2000 portrait identity system; five distinct but connected layers; centered focal structure with 8% edge safety`                                             |
| Project fallback    | `1600x1200 landscape case-study cover; one pillar topology; clear central-right silhouette; useful at card thumbnail size`                                         |
| Article fallback    | `1600x1000 editorial cover; one pillar topology; broad negative space; readable at list and social-preview sizes`                                                  |
| Default social base | `1200x630 wide five-pillar system; central safe region for runtime OG composition; no baked title, name, logo, or UI`                                              |

### Locked negative prompt

```text
people, person, face, portrait, hands, body, silhouette of a human, robot,
android, humanoid, brain, neural-brain icon, chatbot, stock keyboard, laptop
hero shot, office desk, generic server rack, literal cloud-provider diagram,
brand mark, company logo, watermark, signature, readable text, letters, numbers,
code, fake UI, browser chrome, dashboard screenshot, phone screen, product logo,
client identity, trophy, currency, analytics metric, excessive neon, cyberpunk,
rainbow gradient, uncontrolled bloom, dense particles, visual clutter, low-detail
stock render, distorted geometry, broken perspective, compression artifacts
```

Any text-like glyph, accidental logo, person-like form, or motif in this list is
a rejection, even when the generator did not intend it.

## Source-master manifest

All rows start in `planned`. A row cannot become `generated`, `approved`,
`ingested`, `attached`, or `publish_validated` without the evidence defined in
the approval gates. The `media_key` values marked **planned** do not yet exist in
the foundation seed contract.

### Hero and identity masters (6)

|   # | Stable asset ID / media key                               | Dimensions      | Accessibility intent                                                                                              | Intended binding                                | Current gate                                               |
| --: | --------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
|  01 | `hero.frontend.master.v1` / `hero.frontend`               | 2400×1350, 16:9 | Decorative; empty alt because adjacent slide copy carries the meaning                                             | `Site.draft.pillars[frontend].visual_file`      | Source generation and approval pending; B1/B2 resolved     |
|  02 | `hero.backend.master.v1` / `hero.backend`                 | 2400×1350, 16:9 | Decorative; empty alt                                                                                             | `Site.draft.pillars[backend].visual_file`       | Source generation and approval pending; B1/B2 resolved     |
|  03 | `hero.ai_automation.master.v1` / `hero.ai_automation`     | 2400×1350, 16:9 | Decorative; empty alt                                                                                             | `Site.draft.pillars[ai_automation].visual_file` | Source generation and approval pending; B1/B2 resolved     |
|  04 | `hero.system_design.master.v1` / `hero.system_design`     | 2400×1350, 16:9 | Decorative; empty alt                                                                                             | `Site.draft.pillars[system_design].visual_file` | **Selected pilot**; source generation and approval pending |
|  05 | `hero.full_stack.master.v1` / `hero.full_stack`           | 2400×1350, 16:9 | Decorative; empty alt                                                                                             | `Site.draft.pillars[full_stack].visual_file`    | Source generation and approval pending; B1/B2 resolved     |
|  06 | `identity.about.master.v1` / **planned** `identity.about` | 1600×2000, 4:5  | Informative candidate alt: “Abstract five-layer technical system in the portfolio's five-pillar visual language.” | `Site.draft.brand.profile_file`                 | Non-human direction resolved; blocked by B3 and B6         |

Hero decorative intent must be rechecked in the composed page. If an image adds
information not present in adjacent copy, it becomes informative and receives
purposeful alt text before ingestion or attachment.

### Project fallback masters (5)

|   # | Stable asset ID / planned media key                                           | Dimensions     | Accessibility intent                                             | Intended consumer                                         | Current gate                  |
| --: | ----------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------- |
|  07 | `fallback.project.frontend.master.v1` / `fallback.project.frontend`           | 1600×1200, 4:3 | Decorative; empty alt; adjacent card/detail copy carries meaning | Frontend project cards/details missing primary media      | Blocked by B6; B2/B4 resolved |
|  08 | `fallback.project.backend.master.v1` / `fallback.project.backend`             | 1600×1200, 4:3 | Decorative; empty alt; adjacent card/detail copy carries meaning | Backend project cards/details missing primary media       | Blocked by B6; B2/B4 resolved |
|  09 | `fallback.project.ai_automation.master.v1` / `fallback.project.ai_automation` | 1600×1200, 4:3 | Decorative; empty alt; adjacent card/detail copy carries meaning | AI Automation project cards/details missing primary media | Blocked by B6; B2/B4 resolved |
|  10 | `fallback.project.system_design.master.v1` / `fallback.project.system_design` | 1600×1200, 4:3 | Decorative; empty alt; adjacent card/detail copy carries meaning | System Design project cards/details missing primary media | Blocked by B6; B2/B4 resolved |
|  11 | `fallback.project.full_stack.master.v1` / `fallback.project.full_stack`       | 1600×1200, 4:3 | Decorative; empty alt; adjacent card/detail copy carries meaning | Full-Stack project cards/details missing primary media    | Blocked by B6; B2/B4 resolved |

### Article fallback and social masters (6)

|   # | Stable asset ID / media key                                                               | Dimensions       | Accessibility intent                                                                                          | Intended binding/consumer                                 | Current gate                                           |
| --: | ----------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------ |
|  12 | `fallback.article.frontend.master.v1` / **planned** `fallback.article.frontend`           | 1600×1000, 16:10 | Decorative; empty alt; adjacent card/detail copy carries meaning                                              | Frontend article cards/details missing primary media      | Blocked by B6; B2/B4 resolved                          |
|  13 | `fallback.article.backend.master.v1` / **planned** `fallback.article.backend`             | 1600×1000, 16:10 | Decorative; empty alt; adjacent card/detail copy carries meaning                                              | Backend article cards/details missing primary media       | Blocked by B6; B2/B4 resolved                          |
|  14 | `fallback.article.ai_automation.master.v1` / **planned** `fallback.article.ai_automation` | 1600×1000, 16:10 | Decorative; empty alt; adjacent card/detail copy carries meaning                                              | AI Automation article cards/details missing primary media | Blocked by B6; B2/B4 resolved                          |
|  15 | `fallback.article.system_design.master.v1` / **planned** `fallback.article.system_design` | 1600×1000, 16:10 | Decorative; empty alt; adjacent card/detail copy carries meaning                                              | System Design article cards/details missing primary media | Blocked by B6; B2/B4 resolved                          |
|  16 | `fallback.article.full_stack.master.v1` / **planned** `fallback.article.full_stack`       | 1600×1000, 16:10 | Decorative; empty alt; adjacent card/detail copy carries meaning                                              | Full-Stack article cards/details missing primary media    | Blocked by B6; B2/B4 resolved                          |
|  17 | `social.default.master.v1` / `site.default-social`                                        | 1200×630, 40:21  | Informative candidate alt: “Abstract connected system representing the portfolio's five engineering pillars.” | `Site.draft.seo.default_og_file`                          | Source generation and approval pending; B1/B2 resolved |

The five project rows also use **planned** media keys; the bold marker is stated
once here to keep the table compact. The optional Contact/CTA wide visual is not
reserved or generated unless a later composition review proves it adds value.

## Hero mobile QA crops

These five 1080×1350 (4:5) derivatives test crop resilience; they are not new
source masters and are not attachable Files under the current Site contract.

| QA derivative                     | Source                         | Required framing                                                           | Current gate                 |
| --------------------------------- | ------------------------------ | -------------------------------------------------------------------------- | ---------------------------- |
| `hero.frontend.mobile-qa.v1`      | `hero.frontend.master.v1`      | Preserve the responsive-frame focal core; quiet enough beneath mobile copy | Blocked by B5 and generation |
| `hero.backend.mobile-qa.v1`       | `hero.backend.master.v1`       | Preserve queue/data direction and at least one resilient alternate path    | Blocked by B5 and generation |
| `hero.ai_automation.mobile-qa.v1` | `hero.ai_automation.master.v1` | Preserve decision, tool, feedback, and abstract governance boundary        | Blocked by B5 and generation |
| `hero.system_design.mobile-qa.v1` | `hero.system_design.master.v1` | Preserve boundary, primary route, and redundant route without crowding     | Blocked by B5 and generation |
| `hero.full_stack.mobile-qa.v1`    | `hero.full_stack.master.v1`    | Preserve all five layers and the end-to-end hand-off path                  | Blocked by B5 and generation |

The approved master focal point—not an arbitrary center crop—must drive this
export. Until a responsive-media contract exists, public rendering uses the
single hero File and its normalized focal point; the QA crops remain review
evidence only.

## Binding and ingestion status

These notes separate implemented prerequisites from remaining blockers. They do
not mean any image bytes have been generated, approved, ingested, attached, or
published.

### Resolved prerequisites

- **B1 — Seed attachment:** the foundation Site record now declares optional
  `media_bindings` for the five hero intents and the default social intent.
  Pending generated media still skips attachment; ready managed Files bind to
  the draft fields through seed reference reconciliation.
- **B2 — Complete provider-neutral ingestion:** `scripts/seed.ts` constructs
  the managed-media seed gateway for repository media and carries source,
  focal, dominant color, blur, attribution, rights, and generated provenance
  metadata through the same File service boundary used by uploads. No asset may
  bypass this by calling Cloudinary or GCP directly.
- **B4 — Pillar fallback contract:** Site now supports sparse
  `project_files_by_pillar` and `article_files_by_pillar` maps, and public
  project/article consumers resolve explicit media, pillar managed fallback,
  legacy generic managed fallback, then code-owned emergency fallback.

### Remaining blockers

- **B3 — About identity art approval:** user direction and the content-truth
  policy resolve the medium as a non-human abstract identity. Generation still
  waits for the selected direction's pilot approval and a reviewed identity
  composition. The compatible target is `Site.draft.brand.profile_file`.
- **B5 — Responsive hero contract:** a pillar currently owns one `visual_file`;
  there is no separate mobile File binding. Mobile derivatives are QA artifacts
  until the product deliberately adopts a responsive attachment contract.
- **B6 — Seed manifest coverage:** the About identity and ten pillar fallback
  masters have stable planned keys here, but they are not current foundation
  seed media requests. Add them only with compatible bindings, full metadata,
  checksums, and an incremented seed version; documentation does not create
  seed records.

The code-owned emergency SVG/CSS fallbacks remain mandatory for database or
provider failure. Managed fallbacks enhance normal operation and must never
remove that outage-safe layer.

## Pilot and approval gates

`hero.system_design.master.v1` is the first pilot because its boundaries,
redundant paths, theme-sensitive accent, and dense topology stress the selected
direction's hierarchy and crop discipline. Selecting it does not mark the pilot
generated or approved.

The exact effective prompt and metadata checklist for this pilot are stored in
`docs/content/generated-media-system-design-pilot.v1.json`. That file is a
generation request only; it contains no generated bytes, checksum evidence,
license decision, managed File ID, or approval result.

The current generated candidate evidence is recorded in
`docs/content/generated-media-evidence/system-design-pilot.v1.json`. The source
and derivative image bytes are tracked under `seed-assets/` for repeatable
managed-media ingestion, with public preview copies under `public/images/heroes/`.
Candidate evidence is not approval and does not permit public attachment by
itself.

The full five-hero candidate set is recorded in
`docs/content/generated-media-evidence/hero-candidates.v1.json` with the same
tracked-asset policy and pending approval/ingestion gates.

The pilot must pass every gate before any batch generation:

1. **Source gate:** exact 2400×1350 dimensions; no unintended alpha edge;
   source-master SHA-256 recorded from actual bytes.
2. **Creative gate:** visibly matches Architected Intelligence; system-design
   topology is distinct; no negative-prompt motif, text-like artifact, logo, or
   person-like form survives a 100% inspection.
3. **Composition gate:** the live hero copy remains legible over the quiet left
   field; the focal topology survives the 1080×1350 QA crop and does not collide
   with controls.
4. **Responsive gate:** inspect the composed hero at 320, 375, 768, 1024, 1440,
   and 1920 CSS pixels in light and dark themes, with motion disabled as the
   baseline. No horizontal overflow, visible crop failure, or layout shift.
5. **Accessibility gate:** confirm decorative/informative intent in context;
   empty alt only when adjacent copy fully carries the meaning.
6. **Optimization gate:** the production mobile hero derivative is at most
   200 KB and the desktop hero derivative at most 350 KB after the supported
   optimization path. Check banding and geometry at the bounded sizes.
7. **Technical gate:** normalized focal point, six-digit dominant color,
   supported base64 blur placeholder, exact provenance, rights/license result,
   and both source/canonical checksums are complete.
8. **Ingestion gate:** the trusted provider-neutral managed-media path returns
   a ready public File with purpose `hero`; no provider URL, credential, or
   signed URL enters this manifest.
9. **Attachment gate:** the File is referenced by the correct draft pillar,
   reference validation passes, all five pillars remain in canonical order, and
   no public publish occurs from a partial media batch.

Batch approval later requires a five-up review proving that one coherent family
still looks meaningfully different across all pillars. A successful single
pilot cannot satisfy that acceptance criterion by itself.

## Provenance record template

Create one record per source master after bytes exist. `null` means “not yet
known or not supplied”; it must never be replaced with a guessed seed, model,
timestamp, checksum, license, File ID, or provider URL.

```json
{
  "manifest_contract": "portfolio-generated-media/1.0.0",
  "asset_id": "hero.system_design.master.v1",
  "media_key": "hero.system_design",
  "state": "planned",
  "source": {
    "width": 2400,
    "height": 1350,
    "sha256": null
  },
  "generation": {
    "generator": null,
    "model": null,
    "prompt": null,
    "prompt_contract": "architected-intelligence/1.0.0",
    "version": null,
    "seed": null,
    "generated_at": null
  },
  "editorial": {
    "purpose": "hero",
    "is_decorative": true,
    "alt_text": "",
    "focal_point": null,
    "dominant_color": null,
    "blur_data_url": null,
    "attribution": {
      "creator_name": null,
      "source_url": null,
      "credit_text": null,
      "license": null,
      "license_url": null
    }
  },
  "managed_file": {
    "file_id": null,
    "canonical_sha256": null,
    "lifecycle_state": null
  },
  "binding": {
    "model": "Site",
    "field": "draft.pillars[system_design].visual_file",
    "state": "blocked"
  },
  "approval": {
    "creative": null,
    "accessibility": null,
    "technical": null,
    "approved_at": null
  }
}
```

The File record maps `source.sha256` to
`provenance.source_checksum`; the managed service computes the canonical File
`checksum`. Store the exact effective prompt in the protected provenance field.
If a generator exposes no deterministic seed or version, keep that value null
and record only what the tool actually returned in the committed production
manifest revision. Provider assignment remains operational File metadata; it is
not part of this provider-neutral manifest.

## Truth and release constraints

- The five pillar labels are approved information architecture, not proof of
  expertise, employment, clients, outcomes, metrics, or project delivery.
- Generated geometry may represent a capability category; it must not imply a
  named client, proprietary architecture, product interface, certification,
  award, analytics result, or commercial outcome.
- Art approval does not approve adjacent biography, capability, outcome, or CTA
  copy. Those fields retain their content-truth and publication gates.
- No fake person, portrait, signature, testimonial, client mark, UI, code, or
  document is permitted. Missing identity media uses the abstract code-owned
  fallback until the generated identity artwork passes B3.
- `source: generated`, complete provenance, and a reviewed license/rights value
  are required before a generated File is metadata-complete. Never infer rights
  merely from successful generation.
- The repository evidence contains stable IDs, prompts, decisions, checksums,
  tracked seed/public image assets, and opaque File IDs only. It must never
  contain credentials, private evidence, provider secrets, mutable delivery
  URLs, or signed URLs.
- Production publication remains blocked until required Files are ready,
  correctly attached, accessibility-reviewed, truth-compatible, and validated
  by the Site publish graph. A documentation checkbox never lifts that gate.
