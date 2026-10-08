import { VideoPlayerCore } from "@/components/ui/video-player";
import { formatVideoDuration } from "@/lib/content/video-contract";
import { resolveVideoPlayback } from "@/lib/content/video-playback";
import { cn } from "@/lib/utils";
import type { TVideoListItem } from "@/types/video.type";
import { CalendarDays } from "lucide-react";
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
 * One card for both shapes. A landscape film and a reel never share a frame:
 * the player owns its box (16:9 or 9:16) and the text sits below it, so a
 * grid of either shape keeps aligned edges.
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
      className={cn(
        "group border-border bg-card flex h-full flex-col overflow-hidden border shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] duration-[var(--motion-standard)] hover:border-primary/40 hover:shadow-[var(--shadow-md)]",
        isReel
          ? "rounded-[var(--radius-lg-token)]"
          : "rounded-[var(--radius-xl-token)]",
        className
      )}
    >
      <VideoPlayerCore
        src={playback.src}
        title={video.name}
        thumbnailSrc={playback.poster}
        thumbnailSizes={isReel ? REEL_SIZES : LANDSCAPE_SIZES}
        priority={priority}
        orientation={video.aspect_ratio}
      />
      <div className={cn("flex flex-1 flex-col", isReel ? "p-4" : "p-5")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tracking-wide uppercase">
          {video.category?.name ? (
            <span className="text-primary">{video.category.name}</span>
          ) : null}
          {duration ? (
            <span className="text-muted-foreground">{duration}</span>
          ) : null}
        </div>
        <h3
          className={cn(
            "group-hover:text-primary mt-2 leading-snug font-bold transition-colors",
            isReel ? "line-clamp-3 text-base" : "text-xl"
          )}
        >
          <Link
            href={href}
            className="focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
          >
            {video.name}
          </Link>
        </h3>
        {!isReel && video.description ? (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
            {video.description}
          </p>
        ) : null}
        {published ? (
          <p className="text-muted-foreground mt-auto flex items-center gap-2 pt-4 text-xs">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <time dateTime={video.published_at}>{published}</time>
          </p>
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
