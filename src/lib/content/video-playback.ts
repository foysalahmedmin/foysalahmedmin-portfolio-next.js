import {
  toCanonicalYouTubeUrl,
  toYouTubeThumbnailUrl,
} from "./video-contract";

type TPlaybackSource = Readonly<{
  source_type?: string;
  youtube_id?: string | null;
  video_file?: Readonly<{ url?: string }> | null;
  thumbnail?: Readonly<{ url?: string }> | null;
}>;

export type TVideoPlayback = Readonly<{
  /** What the player loads: a canonical YouTube watch URL or a file URL. */
  src: string;
  /** The picture shown before playback; YouTube supplies one when none is set. */
  poster?: string;
}>;

/**
 * One place decides how a stored Video becomes something the player can load,
 * so the cards, the detail page and the home lanes can never disagree.
 */
export const resolveVideoPlayback = (
  video: TPlaybackSource
): TVideoPlayback | null => {
  const poster = video.thumbnail?.url || undefined;
  if (video.source_type === "youtube" && video.youtube_id) {
    return {
      src: toCanonicalYouTubeUrl(video.youtube_id),
      poster: poster ?? toYouTubeThumbnailUrl(video.youtube_id),
    };
  }
  if (video.source_type === "upload" && video.video_file?.url) {
    return { src: video.video_file.url, ...(poster ? { poster } : {}) };
  }
  return null;
};
