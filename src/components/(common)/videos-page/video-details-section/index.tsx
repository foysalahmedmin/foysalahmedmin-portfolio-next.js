import {
  VIDEO_LANE_GRID_CLASS,
  VideoCard,
} from "@/components/content/video-card";
import type { PageHeaderProps } from "@/components/templates/page-header";
import { Tag } from "@/components/ui/tag";
import { VideoPlayerCore } from "@/components/ui/video-player";
import {
  VIDEO_ASPECT_RATIO_LABELS,
  formatVideoDuration,
} from "@/lib/content/video-contract";
import { resolveVideoPlayback } from "@/lib/content/video-playback";
import type { TVideoListItem } from "@/types/video.type";

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

/** The shared PageHeader for a video: system path, Display title, Mono date and duration. */
export const buildVideoHeader = (video: TVideoListItem): PageHeaderProps => {
  const published = formatDate(video.published_at);
  const duration = formatVideoDuration(video.duration_seconds);
  return {
    title: video.name,
    path: [
      { index: 1, name: "Home", href: "/", icon: "house" },
      { index: 2, name: "Videos", href: "/videos" },
      { index: 3, name: video.slug ?? video.name },
    ],
    meta:
      published || duration ? (
        <>
          {published ? (
            <time dateTime={video.published_at}>{published}</time>
          ) : null}
          {duration ? (
            <span>
              <span className="sr-only">Duration </span>
              {duration}
            </span>
          ) : null}
        </>
      ) : undefined,
  };
};

/**
 * The video body (A4 Detail): the player in a hairline frame (greyscale, like every poster) with the
 * description, a sticky aside with the spec sheet and keywords, then related videos of the same shape.
 * The page header and the CtaBand come from the page and its template.
 */
const VideoDetailsSection = ({
  video,
  related,
}: {
  video: TVideoListItem;
  related: readonly TVideoListItem[];
}) => {
  const playback = resolveVideoPlayback(video);
  const isReel = video.aspect_ratio === "reel";
  const keywords = video.keywords ?? [];

  return (
    <>
      <div
        className="ed-detail ed-detail--video container"
        data-video-shape={video.aspect_ratio}
      >
        <div className="ed-main" data-shape={video.aspect_ratio}>
          {playback ? (
            <div className="ed-frame">
              <VideoPlayerCore
                src={playback.src}
                title={video.name}
                thumbnailSrc={playback.poster}
                thumbnailSizes={
                  isReel ? "384px" : "(max-width: 1024px) 100vw, 736px"
                }
                priority
                orientation={video.aspect_ratio}
                className="ed-poster__player"
              />
            </div>
          ) : (
            <p className="ed-frame ed-frame--none">
              This video is not available right now.
            </p>
          )}
          {video.description ? (
            <p className="ed-description">{video.description}</p>
          ) : null}
        </div>

        <aside className="ed-aside" aria-label="About this video">
          <dl className="ed-spec">
            {video.category?.name ? (
              <div>
                <dt className="t-eyebrow">Category</dt>
                <dd>{video.category.name}</dd>
              </div>
            ) : null}
            <div>
              <dt className="t-eyebrow">Shape</dt>
              <dd>{VIDEO_ASPECT_RATIO_LABELS[video.aspect_ratio]}</dd>
            </div>
          </dl>
          {keywords.length > 0 ? (
            <section aria-labelledby="video-keywords-title">
              <h2
                id="video-keywords-title"
                className="ed-aside__title t-eyebrow"
              >
                Keywords
              </h2>
              <ul className="ed-tags" role="list" aria-label="Video keywords">
                {keywords.map((keyword) => (
                  <li key={keyword}>
                    <Tag>{keyword}</Tag>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="ed-related" aria-labelledby="related-videos-title">
          <div className="container">
            <h2 id="related-videos-title" className="ed-related__title">
              {isReel ? "More reels" : "More videos"}
            </h2>
            <ul
              className={VIDEO_LANE_GRID_CLASS[video.aspect_ratio]}
              role="list"
            >
              {related.map((item) => (
                <li key={item._id} className="min-w-0">
                  <VideoCard video={item} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
};

export default VideoDetailsSection;
