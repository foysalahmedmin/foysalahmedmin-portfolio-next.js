import {
  VIDEO_LANE_GRID_CLASS,
  VideoCard,
} from "@/components/content/video-card";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import type { VideoAspectRatio } from "@/lib/content/video-contract";
import type { TVideoListItem } from "@/types/video.type";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const COPY: Record<
  VideoAspectRatio,
  Readonly<{ eyebrow: string; title: string; description: string; cta: string }>
> = {
  landscape: {
    eyebrow: "Watch",
    title: "See the thinking behind the work",
    description:
      "Walkthroughs and talks that show how a problem gets turned into a working solution.",
    cta: "All videos",
  },
  reel: {
    eyebrow: "Reels",
    title: "Short clips, straight to the point",
    description:
      "Quick vertical takes on the tools and habits that keep projects moving.",
    cta: "All reels",
  },
};

const MAX_ITEMS: Record<VideoAspectRatio, number> = { landscape: 3, reel: 4 };

const VideosSection = ({
  videos,
  lane,
  heading,
  unavailable = false,
}: {
  videos: readonly TVideoListItem[];
  /** Which shape this section shows; the home page runs one section per shape. */
  lane: VideoAspectRatio;
  heading?: string;
  unavailable?: boolean;
}) => {
  const items = videos
    .filter((video) => video.aspect_ratio === lane)
    .slice(0, MAX_ITEMS[lane]);
  const copy = COPY[lane];
  const href = lane === "reel" ? "/videos?show=reel" : "/videos";

  return (
    <section
      id={lane === "reel" ? "reels" : "videos"}
      data-video-lane={lane}
      className="py-[var(--space-section)]"
    >
      <div className="container">
        <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionTitle variant="none" className="mb-0 max-w-2xl">
            <Subtitle>{copy.eyebrow}</Subtitle>
            <Title>{heading || copy.title}</Title>
            <Description className="mx-0">{copy.description}</Description>
          </SectionTitle>
          <Link
            href={href}
            className="border-border hover:border-primary focus-visible:ring-ring inline-flex min-h-11 w-fit items-center gap-3 rounded-full border px-5 text-sm font-bold focus-visible:ring-2"
          >
            {copy.cta} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {items.length ? (
          <ul className={VIDEO_LANE_GRID_CLASS[lane]}>
            {items.map((video) => (
              <li key={video._id} className="fade-up min-w-0">
                <VideoCard video={video} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-border bg-surface-subtle rounded-[var(--radius-lg-token)] border p-8 text-center">
            <h3 className="font-bold">
              {unavailable
                ? "Videos are temporarily unavailable"
                : "No published video is available yet"}
            </h3>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
              {unavailable
                ? "The video library could not be reached. The videos page can be retried directly."
                : "Videos stay private until their source and details are complete."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default VideosSection;
