import {
  VIDEO_LANE_GRID_CLASS,
  VideoCard,
} from "@/components/content/video-card";
import { VideoPlayerCore } from "@/components/ui/video-player";
import {
  VIDEO_ASPECT_RATIO_LABELS,
  formatVideoDuration,
} from "@/lib/content/video-contract";
import { resolveVideoPlayback } from "@/lib/content/video-playback";
import { cn } from "@/lib/utils";
import type { TVideoListItem } from "@/types/video.type";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";

const formatDate = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const VideoDetailsSection = ({
  video,
  related,
}: {
  video: TVideoListItem;
  related: readonly TVideoListItem[];
}) => {
  const playback = resolveVideoPlayback(video);
  const isReel = video.aspect_ratio === "reel";
  const published = formatDate(video.published_at);
  const duration = formatVideoDuration(video.duration_seconds);

  return (
    <main className="bg-background min-h-screen" data-video-shape={video.aspect_ratio}>
      <header className="relative overflow-hidden pt-20 pb-10 lg:pt-28">
        <div className="bg-primary/10 pointer-events-none absolute top-0 left-1/2 h-[26rem] w-[60rem] -translate-x-1/2 rounded-full blur-[140px]" />
        <div className="relative container mx-auto px-6">
          <Link
            href="/videos"
            className="text-muted-foreground hover:text-primary focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All videos
          </Link>
          <div className="mt-8 max-w-4xl">
            <div className="flex flex-wrap gap-2">
              {video.category?.name ? (
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-black">
                  {video.category.name}
                </span>
              ) : null}
              <span className="border-border bg-card rounded-full border px-3 py-1.5 text-xs font-bold">
                {VIDEO_ASPECT_RATIO_LABELS[video.aspect_ratio]}
              </span>
            </div>
            <h1 className="mt-5 text-4xl leading-tight font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {video.name}
            </h1>
            <div className="text-muted-foreground mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {published ? (
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4" aria-hidden="true" />
                  <time dateTime={video.published_at}>{published}</time>
                </span>
              ) : null}
              {duration ? (
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {duration}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6">
        {playback ? (
          <div
            className={cn(
              "mx-auto w-full",
              isReel ? "max-w-sm" : "max-w-5xl"
            )}
          >
            <VideoPlayerCore
              src={playback.src}
              title={video.name}
              thumbnailSrc={playback.poster}
              thumbnailSizes={isReel ? "384px" : "(max-width: 1024px) 100vw, 1024px"}
              priority
              orientation={video.aspect_ratio}
              className="border-border rounded-[1.5rem] border shadow-[var(--shadow-lg)]"
            />
          </div>
        ) : (
          <p className="border-border text-muted-foreground mx-auto max-w-xl rounded-2xl border border-dashed p-8 text-center text-sm">
            This video is not available right now.
          </p>
        )}
      </div>

      <article className="container mx-auto px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          {video.description ? (
            <div className="text-muted-foreground text-lg leading-8 whitespace-pre-line">
              {video.description}
            </div>
          ) : null}
          {video.keywords && video.keywords.length > 0 ? (
            <ul
              className="mt-8 flex flex-wrap gap-2"
              aria-label="Video keywords"
            >
              {video.keywords.map((keyword) => (
                <li
                  key={keyword}
                  className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>

      {related.length > 0 ? (
        <section
          className="border-border bg-surface-subtle border-t py-20"
          aria-labelledby="related-videos-title"
        >
          <div className="container mx-auto px-6">
            <h2
              id="related-videos-title"
              className="text-3xl font-black tracking-tight"
            >
              {isReel ? "More reels" : "More videos"}
            </h2>
            <ul className={cn("mt-8", VIDEO_LANE_GRID_CLASS[video.aspect_ratio])}>
              {related.map((item) => (
                <li key={item._id} className="min-w-0">
                  <VideoCard video={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="container mx-auto px-6 pb-24">
        <div className="bg-primary text-primary-foreground mx-auto max-w-3xl rounded-2xl p-8">
          <h2 className="text-2xl font-black">Have a problem like this one?</h2>
          <p className="mt-3 text-sm leading-6 opacity-85">
            Tell me what you are trying to achieve and what is getting in the
            way. I will reply with how I would approach it.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black"
          >
            Start a conversation
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
};

export default VideoDetailsSection;
