# ADR 0004: Rich-content and uploaded-file security boundary

- **Status:** Accepted
- **Date:** 2026-07-15
- **Decision owners:** Repository maintainer, with product-owner approval for editorial capability
- **Supersedes:** None

## Context

Existing project/article HTML reaches `dangerouslySetInnerHTML` without an enforced server sanitizer. Upload validation relies too heavily on client metadata. Both concerns process untrusted bytes and must use narrow, maintained parsers rather than custom string or magic-byte logic.

## Decision

### Rich-content format

Long-form project/article content is an ordered, versioned `ContentBlock[]` discriminated union. Version 1 permits purpose-built blocks such as `rich_text`, `code`, `media`, `quote`, `callout`, and `architecture`. Each type has bounded fields and an exhaustive repository-owned renderer.

`rich_text.html` contains a strict semantic subset sanitized on the server before draft storage and again at publish/migration boundaries. `sanitize-html` is the approved server-only parser. The allowlist starts with paragraphs, headings, lists, links, emphasis, blockquotes, tables, and simple separators. It excludes scripts, styles, forms, SVG, iframe, object/embed, event attributes, inline style, arbitrary classes/IDs, and data URLs.

Images, downloads, video, diagrams, and embeds are not accepted inside rich HTML. They use typed blocks referencing ready managed File IDs or an allowlisted provider identifier. Code is literal text plus an allowlisted language key, not stored HTML. External links permit only `https`, `http`, and explicitly supported `mailto`/`tel` contexts; the renderer adds safe `rel` and target behavior. Redirect and canonical URL fields apply their separate domain allowlists.

Only the audited server renderer may convert a branded `SanitizedHtml` value into `dangerouslySetInnerHTML`. The brand documents provenance but never replaces runtime sanitization. Admin preview consumes the same sanitized DTO/renderer as public output. Raw submitted HTML is not persisted in a second field or logged.

Legacy HTML migrates to a sanitized `rich_text` block, with rejected constructs counted in a dry-run report. Publish is blocked until migration/security validation succeeds. Sanitizer policy and content schema versions are stored so a stricter future policy can be replayed deterministically.

### File validation boundary

All HTTP uploads and trusted seed/media scripts call one provider-neutral `ManagedMediaService`; content modules never call Cloudinary/GCP SDKs or trust provider URLs directly. A File is quarantined until validation succeeds and its state becomes `ready`.

Validation order is:

1. authenticate/authorize the purpose and enforce request/count/byte limits while streaming;
2. normalize the filename and ignore client MIME for trust decisions;
3. detect the signature with `file-type` and compare it with the purpose allowlist;
4. for raster images, decode bounded metadata with `sharp`, enforce dimensions/pixel count/animation policy, auto-orient, strip metadata, and produce canonical output;
5. compute a checksum, persist trusted metadata, upload/finalize through the selected storage adapter, and attach references transactionally or compensate idempotently.

Uploaded SVG and HTML are rejected in v1. Source-reviewed code-native SVG remains in the repository. A resume PDF must identify as PDF, meet a small size limit, and be delivered as an attachment with a safe filename and `nosniff`; it is never embedded inline. Each upload purpose defines its accepted formats, maximum bytes, dimensions/pixels, access class, and ownership—there is no global permissive image/file rule.

`file-type`, `sharp`, and `sanitize-html` are approved security dependencies under ADR 0002; installation and pinned versions occur in the implementation milestone. Parser errors fail closed and return a safe validation code, not raw parser details.

## Consequences and constraints

- Editorial layouts are less arbitrary but portable, testable, and CSP-compatible.
- Existing HTML needs a migration and visual comparison.
- Media becomes usable only after readiness; UIs need processing/error/retry states.
- Mongo transactions cannot include provider operations, so staged states and tested compensation are mandatory.
- Private signed delivery URLs are generated on demand and never persisted in content snapshots.

## Verification

- Security fixtures cover script/event/style/SVG, malformed markup, protocol confusion, encoded URLs, parser differentials, polyglots, MIME mismatch, oversized dimensions, decompression bombs, and truncated files.
- Renderer tests prove every block is exhaustive and no unsanitized type reaches the HTML sink.
- Upload integration tests cover both providers, interrupted finalization, duplicate checksum, reference rollback, and deletion compensation.

## Rollback implication

Previously sanitized content stays safe/readable if the editor UI rolls back. Do not restore the unsafe legacy renderer. A parser rollback requires a security review and re-sanitization report; stored original unsafe input is intentionally unavailable.
