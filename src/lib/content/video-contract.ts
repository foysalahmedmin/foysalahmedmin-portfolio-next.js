/**
 * Shared contract for the Video content type. The aspect ratio and the source
 * are explicit data (never guessed from the file or the URL), so the public UI
 * can give landscape videos and reels their own lanes and frames.
 */
export const VIDEO_ASPECT_RATIOS = ["landscape", "reel"] as const;
export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];

export const VIDEO_ASPECT_RATIO_LABELS: Readonly<
  Record<VideoAspectRatio, string>
> = {
  landscape: "Landscape (16:9)",
  reel: "Reel (9:16)",
};

export const VIDEO_SOURCE_TYPES = ["youtube", "upload"] as const;
export type VideoSourceType = (typeof VIDEO_SOURCE_TYPES)[number];

export const VIDEO_SOURCE_TYPE_LABELS: Readonly<
  Record<VideoSourceType, string>
> = {
  youtube: "YouTube URL",
  upload: "Uploaded file",
};

/**
 * Uploads travel through a serverless request body that Vercel caps at 4.5 MB,
 * so the default limit stays below it. Long videos belong on YouTube.
 */
export const DEFAULT_VIDEO_UPLOAD_MAX_BYTES = 4 * 1_048_576;

export const MAX_VIDEO_KEYWORDS = 20;
export const MAX_VIDEO_KEYWORD_LENGTH = 60;

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);
const YOUTUBE_SHORT_HOSTS = new Set(["youtu.be", "www.youtu.be"]);
const YOUTUBE_PATH_ROUTES = ["embed", "shorts", "live", "v"] as const;

const validId = (candidate: string | null | undefined): string | null =>
  candidate && YOUTUBE_ID_PATTERN.test(candidate) ? candidate : null;

/**
 * Extracts the 11-character video id from every common YouTube link shape
 * (watch, youtu.be, embed, shorts, live) or from a bare id. Anything that is
 * not HTTPS on a YouTube host is rejected, so the value is safe to embed.
 */
export const parseYouTubeVideoId = (input: unknown): string | null => {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2_048) return null;
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (YOUTUBE_SHORT_HOSTS.has(hostname)) {
      return validId(url.pathname.split("/").filter(Boolean)[0]);
    }
    if (!YOUTUBE_HOSTS.has(hostname)) return null;
    const fromQuery = validId(url.searchParams.get("v"));
    if (fromQuery) return fromQuery;
    const segments = url.pathname.split("/").filter(Boolean);
    for (const route of YOUTUBE_PATH_ROUTES) {
      const index = segments.indexOf(route);
      const id = validId(index >= 0 ? segments[index + 1] : null);
      if (id) return id;
    }
  } catch {
    return null;
  }
  return null;
};

export const isYouTubeUrl = (input: unknown): boolean =>
  parseYouTubeVideoId(input) !== null;

/** The single canonical form stored and played, whatever the admin pasted. */
export const toCanonicalYouTubeUrl = (id: string): string =>
  `https://www.youtube.com/watch?v=${id}`;

/**
 * YouTube serves a poster for every public video. The 4:3 `hqdefault` frame
 * always exists; cropped to the player's frame it shows only the picture.
 */
export const toYouTubeThumbnailUrl = (id: string): string =>
  `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const normalizeVideoKeywords = (
  value: readonly unknown[] | undefined
): string[] => {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const entry of value ?? []) {
    if (typeof entry !== "string") continue;
    const keyword = entry
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_VIDEO_KEYWORD_LENGTH)
      .trim();
    const key = keyword.toLowerCase();
    if (!keyword || seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
    if (keywords.length >= MAX_VIDEO_KEYWORDS) break;
  }
  return keywords;
};

export type VideoPublishCandidate = Readonly<{
  aspect_ratio?: string;
  source_type?: string;
  youtube_id?: string | null;
  youtube_url?: string | null;
  video_file?: unknown;
}>;

/** Missing fields that block a Video from being published. */
export const getVideoPublishReadiness = (
  video: VideoPublishCandidate
): string[] => {
  const issues: string[] = [];
  if (!VIDEO_ASPECT_RATIOS.includes(video.aspect_ratio as VideoAspectRatio)) {
    issues.push("aspect_ratio");
  }
  if (video.source_type === "youtube") {
    if (
      !parseYouTubeVideoId(video.youtube_id) &&
      !parseYouTubeVideoId(video.youtube_url)
    ) {
      issues.push("youtube_url");
    }
  } else if (video.source_type === "upload") {
    if (!video.video_file) issues.push("video_file");
  } else {
    issues.push("source_type");
  }
  return issues;
};

export const formatVideoDuration = (seconds: number | undefined): string => {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const rest = total % 60;
  const padded = String(rest).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${padded}`
    : `${minutes}:${padded}`;
};
