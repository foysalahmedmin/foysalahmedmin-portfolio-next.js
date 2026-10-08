# ADR 0010: Case study and Video libraries

- **Status:** Accepted
- **Date:** 2026-10-08
- **Supersedes:** None (extends ADR 0003 typed Pages and ADR 0004 file security)

## Context

Projects and articles cover long-form work, but the site also needs in-depth case studies and a video library with two distinct shapes (landscape and vertical reels). Both must follow the existing rules: soft delete, files linked through the File collection, publish only reviewed content, and fixed typed Pages.

## Decision

Two content types are added, each with its own category type, API, admin workspace and public routes. They reuse the article/project patterns instead of a generic abstraction so that each stays easy to read and migrate.

| Type       | Collection                                  | Public routes                    | Admin                    |
| ---------- | ------------------------------------------- | -------------------------------- | ------------------------ |
| Case study | `case_studies`, `case_study_categories`     | `/case-studies`, `/case-studies/[slug]` | `/admin/case-studies`    |
| Video      | `videos`, `video_categories`                | `/videos`, `/videos/[slug]`      | `/admin/videos`          |

### Video

- `aspect_ratio`: `landscape` (16:9) or `reel` (9:16), chosen explicitly, never guessed.
- `source_type`: `youtube` or `upload`. YouTube links of any common shape are normalised to `https://www.youtube.com/watch?v=<id>` plus `youtube_id`; an upload stores a File reference (`video_file`, purpose `video_file`). The two sources are mutually exclusive at the model level.
- `thumbnail` (purpose `video`), `description` and `keywords` are optional; a YouTube video falls back to YouTube's own poster.
- The public UI never mixes shapes: the Videos page and the home page render a landscape lane and a reel lane, each with its own grid, page size and page counter. Playback uses `VideoPlayerCore` with `orientation`.

### Case study

Structured problem-first story: overview, challenge, approach, key decisions, solution, results summary and outcomes (with the same verification states as Projects), client facts (the client name is hidden unless `show_client_name` is true), tools, services, learnings, optional long-form sanitized content, gallery, and optional public links. Thumbnail and gallery use purpose `case_study`.

### Files

- `FILE_PURPOSES` gains `case_study`, `video` and `video_file`; the File reference models gain `CaseStudy`, `CaseStudyCategory`, `Video` and `VideoCategory`.
- The managed media pipeline gains a `video` kind: MP4 or WebM, signature-checked, stored untouched (no transcoding), MP4 size, rotation and duration read with a small bounds-checked parser. Cloudinary uses the `video` resource type.
- Uploaded video travels through a serverless request body, which Vercel caps at 4.5 MB. The default upload limit is therefore 4 MiB (`MEDIA_VIDEO_MAX_UPLOAD_BYTES` raises it for self-hosting). Longer videos should use YouTube.

### Pages and publishing

- Fixed routes `case-studies` and `videos`; section kinds `case-study-collection` and `video-collection`. A video section accepts a `featured` and an `aspect_ratio` filter, so a Page can hold one section per shape.
- A Page can only be published when every record it lists is publicly eligible, including its category, author and files, exactly like articles and projects.
- Public discovery is server-rendered from the URL (search, category, role or shape, sort, page), so it is shareable and works without JavaScript.

### Security

- Only YouTube may be framed on public pages: `frame-src` and `script-src` allow `https://www.youtube.com` (and `youtube-nocookie.com` for frames); `Permissions-Policy` delegates autoplay, accelerometer and gyroscope to YouTube only. Page preview documents stay frame-free.
- YouTube links are accepted only over HTTPS on YouTube hosts; stored values are canonical.

### Data

Migration `202610080001-case-study-and-video-foundation` creates the unique active-slug, active-name and publication indexes. Launch content (`pnpm tsx scripts/launch-content.ts`) creates categories, four case studies and seven videos idempotently, adds the navigation links and the home sections, and publishes the new Pages. The launch videos are public YouTube videos credited to their channels and are placeholders to replace from Admin → Videos.

## Consequences

- Adding either type touches the same registries as articles (slug scopes, cache domains, audit targets, capability matrix, Page registry, resolver and graph); the TypeScript compiler lists every place.
- The YouTube embed relies on `react-player` and a patched `youtube-video-element` (`patches/youtube-video-element@1.9.0.patch`), which gives the iframe real pixel sizes, including on the first, slowest mount.
