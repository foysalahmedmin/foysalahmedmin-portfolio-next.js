import {
  DiscoveryFilters,
  type TDiscoveryFilterField,
} from "@/components/content/discovery-filters";
import {
  VIDEO_LANE_GRID_CLASS,
  VideoCard,
} from "@/components/content/video-card";
import { EmptyState } from "@/components/ui/async-state";
import { LinkPagination } from "@/components/ui/link-pagination";
import {
  DEFAULT_VIDEO_DISCOVERY_QUERY,
  VIDEO_DISCOVERY_SORTS,
  hasVideoDiscoveryFilters,
  mergeVideoDiscoveryQueryString,
  type VideoDiscoveryQuery,
} from "@/lib/discovery/video-discovery";
import type { VideoAspectRatio } from "@/lib/content/video-contract";
import type { TVideoCategory } from "@/types/video-category.type";
import type { TVideoListItem } from "@/types/video.type";
import { Clapperboard, Smartphone, Video as VideoIcon } from "lucide-react";
import { Suspense } from "react";

export type TVideosLane = Readonly<{
  items: readonly TVideoListItem[];
  meta: Readonly<{ total: number; page: number; limit: number }>;
}>;

export type VideosContentSectionProps = Readonly<{
  landscape: TVideosLane;
  reel: TVideosLane;
  categories: readonly TVideoCategory[];
  query: VideoDiscoveryQuery;
  initialError?: boolean;
}>;

const SORT_LABELS: Record<(typeof VIDEO_DISCOVERY_SORTS)[number], string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  featured: "Featured first",
  name: "Title A–Z",
};

const LANES = {
  landscape: {
    id: "landscape-videos",
    title: "Landscape videos",
    blurb: "Full-frame walkthroughs and talks, best on a big screen.",
    Icon: Clapperboard,
    pageKey: "landscape_page",
  },
  reel: {
    id: "reels",
    title: "Reels",
    blurb: "Short vertical clips, made for the phone.",
    Icon: Smartphone,
    pageKey: "reel_page",
  },
} as const satisfies Record<
  VideoAspectRatio,
  Readonly<{
    id: string;
    title: string;
    blurb: string;
    Icon: typeof VideoIcon;
    pageKey: "landscape_page" | "reel_page";
  }>
>;

const Lane = ({
  lane,
  data,
  query,
  first,
}: {
  lane: VideoAspectRatio;
  data: TVideosLane;
  query: VideoDiscoveryQuery;
  /** The first lane on the page holds the above-the-fold poster. */
  first: boolean;
}) => {
  const config = LANES[lane];
  const totalPages = Math.max(1, Math.ceil(data.meta.total / data.meta.limit));
  const page = Math.min(query[config.pageKey], totalPages);
  const hrefFor = (target: number) =>
    `/videos${mergeVideoDiscoveryQueryString("", {
      ...query,
      [config.pageKey]: target,
    })}#${config.id}`;

  return (
    <section
      id={config.id}
      aria-labelledby={`${config.id}-heading`}
      data-video-lane={lane}
      className="scroll-mt-28"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id={`${config.id}-heading`}
            className="flex items-center gap-3 text-2xl font-bold"
          >
            <config.Icon className="text-primary size-6" aria-hidden="true" />
            {config.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{config.blurb}</p>
        </div>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {data.meta.total} {data.meta.total === 1 ? "video" : "videos"}
        </p>
      </header>
      {data.items.length ? (
        <>
          <ul className={VIDEO_LANE_GRID_CLASS[lane]}>
            {data.items.map((video, index) => (
              <li key={video._id} className="min-w-0">
                <VideoCard video={video} priority={first && index === 0} />
              </li>
            ))}
          </ul>
          <LinkPagination
            page={page}
            totalPages={totalPages}
            hrefFor={hrefFor}
            ariaLabel={`${config.title} result pages`}
            className="mt-10"
          />
        </>
      ) : (
        <p className="border-border text-muted-foreground rounded-[var(--radius-lg-token)] border border-dashed p-8 text-center text-sm">
          No {lane === "reel" ? "reels" : "landscape videos"} match the current
          filters.
        </p>
      )}
    </section>
  );
};

const VideosContentSection = ({
  landscape,
  reel,
  categories,
  query,
  initialError = false,
}: VideosContentSectionProps) => {
  const filtersActive = hasVideoDiscoveryFilters(query);
  const total = landscape.meta.total + reel.meta.total;
  const hasSelectedCategory = categories.some(
    (category) => category.slug === query.category
  );
  const fields: TDiscoveryFilterField[] = [
    {
      type: "search",
      key: "search",
      label: "Search",
      value: query.search,
      placeholder: "Search by title, topic or keyword",
    },
    {
      type: "select",
      key: "category",
      label: "Category",
      value: query.category,
      defaultValue: DEFAULT_VIDEO_DISCOVERY_QUERY.category,
      options: [
        { value: "all", label: "All categories" },
        ...(query.category !== "all" && !hasSelectedCategory
          ? [
              {
                value: query.category,
                label: `Unavailable category: ${query.category}`,
              },
            ]
          : []),
        ...categories.map((category) => ({
          value: category.slug,
          label: category.name,
        })),
      ],
    },
    {
      type: "select",
      key: "show",
      label: "Shape",
      value: query.show,
      defaultValue: DEFAULT_VIDEO_DISCOVERY_QUERY.show,
      options: [
        { value: "all", label: "Landscape and reels" },
        { value: "landscape", label: "Landscape only" },
        { value: "reel", label: "Reels only" },
      ],
    },
    {
      type: "select",
      key: "sort",
      label: "Sort",
      value: query.sort,
      defaultValue: DEFAULT_VIDEO_DISCOVERY_QUERY.sort,
      options: VIDEO_DISCOVERY_SORTS.map((sort) => ({
        value: sort,
        label: SORT_LABELS[sort],
      })),
    },
  ];

  return (
    <section
      aria-labelledby="video-results-heading"
      className="py-16 lg:py-24"
    >
      <div className="container">
        <div className="border-border bg-surface-subtle rounded-[var(--radius-xl-token)] border p-5 lg:p-7">
          <p className="type-label text-primary">Video library</p>
          <h2 id="video-results-heading" className="mt-2 mb-5 text-2xl font-bold">
            Watch how the work gets done
          </h2>
          <Suspense fallback={null}>
            <DiscoveryFilters
              legend="Filter and sort videos"
              fields={fields}
              resetKeys={["landscape_page", "reel_page"]}
              clearHref="/videos"
              className="sm:grid-cols-2 lg:grid-cols-5"
            />
          </Suspense>
        </div>

        <p
          className="text-muted-foreground mt-8 text-sm"
          aria-live="polite"
        >
          {total} {total === 1 ? "video" : "videos"}
          {filtersActive ? " match the current filters" : " available"}.
        </p>

        <div className="mt-8 space-y-16">
          {initialError ? (
            <EmptyState
              title="Videos could not be loaded"
              description="The published library is temporarily unavailable. Please try again in a moment."
            />
          ) : total === 0 ? (
            <EmptyState
              icon={<VideoIcon className="size-5" aria-hidden="true" />}
              title={
                filtersActive ? "No matching videos" : "No published videos yet"
              }
              description={
                filtersActive
                  ? "Try a broader category, shape or search phrase."
                  : "Published videos will appear here when they are ready."
              }
            />
          ) : (
            <>
              {query.show !== "reel" &&
              (landscape.items.length > 0 || query.show === "landscape") ? (
                <Lane lane="landscape" data={landscape} query={query} first />
              ) : null}
              {query.show !== "landscape" &&
              (reel.items.length > 0 || query.show === "reel") ? (
                <Lane
                  lane="reel"
                  data={reel}
                  query={query}
                  first={query.show === "reel" || landscape.items.length === 0}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default VideosContentSection;
