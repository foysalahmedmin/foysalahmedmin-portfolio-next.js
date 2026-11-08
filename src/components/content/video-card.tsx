import { VideoPlayerCore } from "@/components/ui/video-player";
import { formatVideoDuration } from "@/lib/content/video-contract";
import { resolveVideoPlayback } from "@/lib/content/video-playback";
import { cn } from "@/lib/utils";
import type { TVideoListItem } from "@/types/video.type";
import Link from "next/link";

const formatDate = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const LANDSCAPE_SIZES =
  "(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw";
const REEL_SIZES = "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw";

type TVideoCardProps = Readonly<{
  video: TVideoListItem;
  /** True for the single card that is visible without scrolling. */
  priority?: boolean;
  className?: string;
}>;

/**
 * One poster card for both shapes. A landscape film and a reel never share a frame: the player owns its box
 * (16:9 or 9:16) and the text sits below it, so a grid of either shape keeps aligned edges. The poster and
 * the embedded player are greyscale (`ed-poster__player`) and carry a Mono duration chip; the title is the
 * link. Styles: `ed-*` in pages-editorial.css.
 */
export const VideoCard = ({ video, priority, className }: TVideoCardProps) => {
  const playback = resolveVideoPlayback(video);
  if (!playback) return null;
  const href = `/videos/${video.slug ?? video._id}`;
  const isReel = video.aspect_ratio === "reel";
  const duration = formatVideoDuration(video.duration_seconds);
  const published = formatDate(video.published_at);

  return (
    <article
      data-video-shape={video.aspect_ratio}
      className={cn("ed-vcard", className)}
    >
      <div className="ed-poster">
        <VideoPlayerCore
          src={playback.src}
          title={video.name}
          thumbnailSrc={playback.poster}
          thumbnailSizes={isReel ? REEL_SIZES : LANDSCAPE_SIZES}
          priority={priority}
          orientation={video.aspect_ratio}
          className="ed-poster__player"
        />
        {duration ? (
          <span className="ed-duration t-eyebrow t-mono">
            <span className="sr-only">Duration </span>
            {duration}
          </span>
        ) : null}
      </div>
      <div className="ed-vcard__body">
        {video.category?.name || published ? (
          <p className="ed-vcard__meta t-eyebrow">
            {video.category?.name ? <span>{video.category.name}</span> : null}
            {published ? (
              <time dateTime={video.published_at}>{published}</time>
            ) : null}
          </p>
        ) : null}
        <h3 className="ed-vcard__title">
          <Link href={href} className="ed-vcard__link link-draw">
            {video.name}
          </Link>
        </h3>
        {!isReel && video.description ? (
          <p className="ed-vcard__desc">{video.description}</p>
        ) : null}
      </div>
    </article>
  );
};

/** The grid each shape lives in; the column counts follow the frame shape. */
export const VIDEO_LANE_GRID_CLASS = {
  landscape: "grid gap-6 md:grid-cols-2 xl:grid-cols-3",
  reel: "grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4",
} as const;
