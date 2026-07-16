# Managed media security and operations

This document is the operating contract for uploads, stored `File` records,
references, delivery, and deletion. It implements the file half of
[ADR 0004](../architecture/0004-rich-content-and-file-security.md). The
provider-neutral managed-media service is the only supported ingestion path for
HTTP uploads, the File API, and trusted seed/media scripts. Content modules must
store File IDs; they must not call a Cloudinary/GCP SDK or accept a provider URL
as content.

## Non-negotiable invariants

- Client filenames, MIME types, extensions, dimensions, URLs, checksums, and
  provider responses are untrusted until server validation succeeds.
- An upload is not renderable or attachable until its File lifecycle is
  `ready`, active, authorized for the actor, and compatible with the target
  field's purpose.
- Uploaded SVG and HTML are rejected. Repository-owned, source-reviewed SVG is
  not uploaded media.
- Raster images are decoded with bounded resources, auto-oriented, stripped of
  metadata, and re-encoded to a canonical format. Animated images are rejected
  in v1.
- Provider operations are outside MongoDB transactions. Every boundary has an
  idempotent retry or compensation path.
- Storage keys are immutable and versioned. Uploads never overwrite an existing
  object, and a mutable signed URL is never stored in a File or content snapshot.
- A referenced File cannot be soft- or permanently deleted. Safe detach must
  update the owning draft/published snapshot and its File reference first.
- Delivery and deletion use the provider metadata stored on the File record,
  not the current `STORAGE_PROVIDER` value.

## Purpose policy

The source policy registry is authoritative; routes may make a policy narrower
but never broader. Limits apply to canonical output as well as submitted bytes,
and the upload route applies the aggregate request/count limits before
buffering. The initial policy is deliberately image-focused.

| Purpose       | Accepted input → canonical output | Input/output maximum | Geometry                 | Default access |
| ------------- | --------------------------------- | -------------------: | ------------------------ | -------------- |
| `logo`        | JPEG, PNG, WebP, AVIF → WebP      |        2 MiB / 2 MiB | 32×32–4096×4096; 16 MP   | public         |
| `hero`        | JPEG, PNG, WebP, AVIF → WebP      |        8 MiB / 8 MiB | 800×450–8192×8192; 40 MP | public         |
| `project`     | JPEG, PNG, WebP, AVIF → WebP      |        8 MiB / 8 MiB | 320×180–8192×8192; 40 MP | public         |
| `article`     | JPEG, PNG, WebP, AVIF → WebP      |        8 MiB / 8 MiB | 320×180–8192×8192; 40 MP | public         |
| `profile`     | JPEG, PNG, WebP, AVIF → WebP      |        5 MiB / 5 MiB | 128×128–6144×6144; 20 MP | public         |
| `resume`      | PDF → unchanged PDF               |        5 MiB / 5 MiB | not applicable           | private        |
| `page`        | JPEG, PNG, WebP, AVIF → WebP      |        8 MiB / 8 MiB | 320×180–8192×8192; 40 MP | public         |
| `service`     | JPEG, PNG, WebP, AVIF → WebP      |        5 MiB / 5 MiB | 256×144–6144×6144; 24 MP | public         |
| `skill`       | JPEG, PNG, WebP, AVIF → WebP      |        3 MiB / 3 MiB | 64×64–4096×4096; 16 MP   | public         |
| `timeline`    | JPEG, PNG, WebP, AVIF → WebP      |        5 MiB / 5 MiB | 256×144–6144×6144; 24 MP | public         |
| `credential`  | JPEG, PNG, WebP, AVIF → WebP      |        5 MiB / 5 MiB | 256×144–6144×6144; 24 MP | public         |
| `testimonial` | JPEG, PNG, WebP, AVIF → WebP      |        5 MiB / 5 MiB | 128×128–6144×6144; 20 MP | public         |
| `social`      | JPEG, PNG, WebP, AVIF → WebP      |        5 MiB / 5 MiB | 600×315–4096×4096; 16 MP | public         |
| `document`    | PDF → unchanged PDF               |      10 MiB / 10 MiB | not applicable           | private        |
| `generic`     | JPEG, PNG, WebP, AVIF → WebP      |      10 MiB / 10 MiB | 32×32–8192×8192; 40 MP   | private        |

`resume` and `document` input must identify as PDF from its signature, are never
embedded inline, and are delivered with `Content-Disposition: attachment` and
a safe filename. Generic media is private by default; widening its access
requires a separate, authorized publish operation. Video/audio support requires
a new purpose policy with explicit codec, dimensions, duration, frame-count,
and resource limits—it must not be enabled through a MIME allowlist alone.

Editorial media health is independent of byte safety. A ready object may still
be `metadata_status=incomplete` when accessibility, crop, visual placeholder,
rights, or generated provenance fields need human remediation. That flag does
not invent defaults and does not weaken the ready-state storage invariants.

## Ingestion and lifecycle

The service performs these stages in order:

1. Authenticate and authorize the requested purpose. Reject an oversized
   `Content-Length`, excessive file count, or exhausted upload-concurrency slot
   before parsing the multipart body.
2. Normalize the display filename for metadata only. Detect the byte signature
   with the maintained parser and require agreement between detected type,
   purpose policy, and allowed extension. Parser ambiguity, truncated input,
   polyglots, SVG, and HTML fail closed.
3. Decode bounded raster metadata, enforce width/height/pixel/animation limits,
   auto-orient, strip metadata, and re-encode. Compute the checksum from the
   canonical bytes so equivalent stored output has stable deduplication
   semantics.
4. Select the configured provider for this new upload and upload canonical bytes
   under a new immutable key. The adapter may keep the object staged/private
   until finalization.
5. In a MongoDB transaction, create or resolve the idempotent File record in
   `uploading`. A duplicate checksum is reused only when purpose, owner/access
   scope, and authorization allow it. A later content mutation attaches that
   ready File through the reference service; provider work is never represented
   as part of that database transaction.
6. After commit, finalize provider access and compare the provider result with
   the expected account, bucket/folder, key, size, and type. Atomically transition
   the File to `ready`. A provider whose upload is already immutable may have a
   no-op finalize adapter, but it follows the same lifecycle.

Lifecycle meanings:

| State       | Meaning and permitted action                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `uploading` | Quarantined/staged; not deliverable or attachable. Finalize or compensate after a bounded timeout.                               |
| `ready`     | Validated and available under its access policy. The only state accepted by normal reads and reference attachment.               |
| `orphaned`  | Provider object exists without a usable committed reference. Cleanup may delete it idempotently.                                 |
| `deleting`  | A worker owns a bounded deletion lease. Restore/attach is blocked until completion or lease recovery.                            |
| `error`     | A safe error code and retry metadata are recorded; raw provider/parser details are not. Retry or quarantine cleanup is required. |

State changes use compare-and-set predicates. Retrying the same operation must
return its current result or advance it once; it must not create a second object,
duplicate a reference, overwrite bytes, or resurrect a deletion.

## Failure boundaries and compensation

| Failure boundary                                     | Required outcome                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Validation or canonicalization                       | No provider call and no persistent File. Return a stable validation code.                                                                              |
| Provider upload                                      | No committed File/reference. A partial object is removed by the adapter when possible.                                                                 |
| Database transaction                                 | Delete the uploaded object idempotently. If immediate deletion fails, leave it under the staged prefix for the orphan scanner; do not expose it.       |
| Post-commit provider finalization                    | Keep the File non-ready, record a safe retry code, and retry finalization or mark it orphaned for deletion.                                            |
| Ready-state compare-and-set                          | Re-read by idempotency key/checksum. Never upload a replacement merely because the response was lost.                                                  |
| Reference mutation                                   | Roll back the transaction, or compensate only the reference delta. Existing referenced media is never deleted as compensation for a new content write. |
| Provider deletion                                    | Keep the File under a retryable `error`/deletion lease; do not hard-delete the database record.                                                        |
| Provider deletion succeeds but DB finalization fails | Retry after the lease. Provider delete treats not-found as success, then the token-owning worker finalizes the DB deletion.                            |

Provider objects use a managed immutable prefix/tag and creation timestamp so a
scheduled scanner can compare aged staged objects with File records. The scanner
must use a grace period longer than the maximum upload/finalization duration and
must never delete a matching active File.

## References and deletion

Attach, detach, replace, publish, restore, and permanent-delete operations must
check the File in the same database transaction as the owning record whenever
the deployment supports transactions. Attachment requires `ready`, not deleted,
purpose-compatible, access-compatible, and actor-authorized. The reference tuple
`(model, entity, field)` is idempotent.

Soft delete requires zero references, including references from drafts and
published snapshots. Permanent delete additionally requires an already
soft-deleted File and an acquired deletion lease. The provider is selected from
the File record and its stored key/bucket/resource metadata. Only the worker
owning that lease token can hard-delete the record. Bulk operations report
succeeded, not-found, referenced/state-conflict, and failed IDs separately.

## Public and private delivery

Public delivery is allowed only for a `ready`, active, public File whose
canonical provider URL passes the exact delivery allowlist:

- Cloudinary: HTTPS on `res.cloudinary.com`, for the configured/stored cloud
  name and expected managed asset path.
- GCP: HTTPS on `storage.googleapis.com`, for the File's stored bucket and exact
  encoded object key.

Reject alternate schemes, userinfo, lookalike/subdomain hosts, protocol-relative
URLs, fragments, unexpected ports, encoded path separators/traversal, and a
provider account/bucket mismatch. Application rendering uses provider-neutral
File metadata (`url`, dimensions, focal/blur metadata) with `next/image`; content
must not depend on Cloudinary-only transformations.

Private delivery first authorizes the caller or public-published reference, then
asks the File record's provider adapter for a short-lived URL. Clamp its TTL to
the service maximum, return it with non-cacheable response headers, and never
persist or log it. Resume responses also use `nosniff` and attachment disposition.

## Provider switching

`STORAGE_PROVIDER` controls new ingestion only and defaults to `cloudinary`.
Every File retains its provider plus the metadata needed to deliver and delete
that exact object. Keep credentials and read/delete permission for every provider
that still owns live records. Before retiring a provider:

1. stop new writes to it and inventory ready, non-ready, deleted, and referenced
   records by provider;
2. migrate through the managed service with checksum verification and a new
   immutable object—never rewrite the old record's provider metadata in place;
3. switch references atomically, verify delivery, then delete the old File/object
   through the normal leased workflow;
4. remove old credentials only after the inventory and orphan scan are empty.

## Cleanup, retry, and monitoring

A scheduled caller invokes the Node-only, authenticated reconciliation endpoint
for `uploading`, `orphaned`, and retryable `error` records. It also inventories
managed provider prefixes, waits at least the one-hour grace window, compares
objects with active and deleted File records, rechecks immediately before an
idempotent delete, and reports hashed failed keys. Deletion leases separately
recover expired permanent-delete attempts. Overlapping calls are safe because
provider deletion treats not-found as success and every database mutation uses a
state predicate. Repeated failures stay quarantined for operator review.

Monitor aggregate counts and age by state/provider/purpose, validation-code rate,
upload/finalize/delete latency, retry exhaustion, and orphan cleanup failures.
Alerts must identify operation/File IDs and safe codes only. Never emit content
bytes, original private URLs, signed URLs, authorization headers, provider SDK
payloads, credentials, or contact/user PII.

## Environment and deployment

Required provider configuration:

- `STORAGE_PROVIDER=cloudinary|gcp` (new uploads; default `cloudinary`)
- `MEDIA_UPLOAD_MAX_REQUEST_BYTES` (aggregate early request ceiling; default
  `67108864`)
- `MEDIA_UPLOAD_MAX_CONCURRENCY` (in-process pre-buffer concurrency ceiling;
  default `3`; also enforce a deployment-wide limit at the gateway/platform)
- `MEDIA_RECONCILE_SECRET` (high-entropy bearer secret for the scheduled
  reconciliation endpoint; interactive super-admin authorization is also
  supported)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
  `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`
- `GCP_PROJECT_ID`, `GCP_PUBLIC_BUCKET_NAME`, `GCP_PRIVATE_BUCKET_NAME`, and
  `GCP_CREDENTIALS_PATH` (or workload identity). The private bucket is required
  for private media, must differ from the public bucket, and is anonymously
  probed after upload so a public IAM policy fails closed. `GCP_BUCKET_NAME` is
  only a legacy alias for the public bucket.

Configure only server-side secrets; none use a `NEXT_PUBLIC_` prefix. Production
routes explicitly use the Node runtime. Provider buckets/accounts grant the
application only required object create/read/delete/sign permissions, disable
overwrite, and keep staged/private objects non-public. Purpose limits, signature
allowlists, signed-URL TTL ceilings, retry limits, and lifecycle rules are
versioned application policy rather than freely tunable environment values.

At deploy time, verify both configured adapters when the database contains both
providers, run a provider-neutral upload/finalize/deliver/delete smoke test with
non-production bytes, and confirm worker scheduling and alerts.

## Safe errors

Client responses use stable codes and generic messages such as
`MEDIA_TYPE_REJECTED`, `MEDIA_LIMIT_EXCEEDED`, `MEDIA_NOT_READY`,
`MEDIA_REFERENCE_CONFLICT`, `MEDIA_DELIVERY_DENIED`, and
`MEDIA_PROVIDER_UNAVAILABLE`. Parser/provider/database exceptions are preserved
only in protected telemetry after redaction. Never concatenate raw SDK messages,
object URLs/keys, local paths, bucket/cloud names, request headers, environment
values, credentials, or signed query strings into an API response.
