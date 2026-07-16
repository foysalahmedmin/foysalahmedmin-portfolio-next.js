# File metadata and provenance rollout

Migration `202607150009-file-metadata-provenance` is an expand-only File
contract migration. Existing media remains readable while the admin media
library identifies records that need a human editorial or rights decision.

## Contract boundaries

- `checksum` remains the SHA-256 of the canonical bytes stored by the managed
  media service. `provenance.source_checksum`, when supplied, identifies a
  generated source/master before canonicalization.
- Width and height remain provider-neutral `metadata.width` and
  `metadata.height`; public renderers must not depend on Cloudinary transforms.
- `alt_text`, decorative intent, focal point, dominant color, blur data URL,
  source, generation provenance, attribution, and license are typed File data.
- Prompt and seed are schema-hidden and require an explicit privileged query;
  provider keys and signed/private URLs are also internal data. Future public
  Site/Page DTOs must project only the delivery and rendering fields they need.
- Site, Page, Service, Skill/SkillGroup, TimelineEntry, Credential, FAQ,
  Testimonial, and LegalDocument may attach Files through the existing
  reference service. Content modules still store File ObjectIds, never provider
  URLs.

## Safe backfill policy

The migration copies numeric legacy top-level dimensions into the established
metadata object, maps `gcp` to `gcs`, recognizes an exact provider hostname or
provider-specific metadata only when the evidence is unambiguous, and preserves
an explicit legacy `uploaded`/`generated` source. Complete generation
provenance can also establish `generated`.

It does **not** infer copy, decorative intent, focal points, colors, blur data,
prompts, authorship, attribution, or license. Conflicting provider signals are
left unresolved. Every record receives deterministic `metadata_status` and
`metadata_missing` fields so an editor can remediate gaps without fabricated
claims.

## Deployment order

1. Deploy the additive schema, upload DTO, reference enums, and UI types.
2. Run `pnpm db:migrate:dry-run`; review only aggregate derivable/incomplete
   counts.
3. Apply migration `202607150009-file-metadata-provenance` and verify the
   `file_metadata_health` index.
4. Use the later media library to resolve incomplete metadata. Do not make the
   editorial fields globally required until published media health is clean.
5. Roll back application readers before any compensating schema change. Never
   edit an already-applied migration source file.
