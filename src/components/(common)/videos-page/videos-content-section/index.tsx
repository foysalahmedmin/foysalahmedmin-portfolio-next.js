import { LabSwitcher } from "@/components/content/lab-switcher";
import {
  VIDEO_LANE_GRID_CLASS,
  VideoCard,
} from "@/components/content/video-card";
import type { VideoAspectRatio } from "@/lib/content/video-contract";
import {
  VIDEO_DISCOVERY_SORTS,
  hasVideoDiscoveryFilters,
  mergeVideoDiscoveryQueryString,
  type VideoDiscoveryQuery,
} from "@/lib/discovery/video-discovery";
import type { TVideoCategory } from "@/types/video-category.type";
import type { TVideoListItem } from "@/types/video.type";
import {
  IndexCount,
  IndexFilterChips,
  IndexFilterForm,
  IndexNotice,
  IndexPager,
  type TIndexChip,
} from "../../articles-page/editorial-index";

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

const SHOW_LABELS = {
  all: "Landscape and reels",
  landscape: "Landscape only",
  reel: "Reels only",
} as const;

const LANES = {
  landscape: {
    id: "landscape-videos",
    title: "Landscape videos",
    blurb: "Full-frame walkthroughs and talks, best on a big screen.",
    pageKey: "landscape_page",
  },
  reel: {
    id: "reels",
    title: "Reels",
    blurb: "Short vertical clips, made for the phone.",
    pageKey: "reel_page",
  },
} as const satisfies Record<
  VideoAspectRatio,
  Readonly<{
    id: string;
    title: string;
    blurb: string;
    pageKey: "landscape_page" | "reel_page";
  }>
>;

const hrefFor = (state: VideoDiscoveryQuery) =>
  `/videos${mergeVideoDiscoveryQueryString("", state)}`;

/** One lane: landscape posters in a grid, or reels in a vertical grid. Each lane pages on its own counter. */
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

  return (
    <section
      id={config.id}
      aria-labelledby={`${config.id}-heading`}
      data-video-lane={lane}
      className="ed-lane"
    >
      <header className="ed-lane__head">
        <div>
          <h2 id={`${config.id}-heading`} className="ed-lane__title">
            {config.title}
          </h2>
          <p className="ed-lane__blurb">{config.blurb}</p>
        </div>
        <p className="ed-count t-eyebrow" aria-live="polite">
          {data.meta.total} {data.meta.total === 1 ? "video" : "videos"}
        </p>
      </header>
      {data.items.length ? (
        <>
          <ul className={VIDEO_LANE_GRID_CLASS[lane]} role="list">
            {data.items.map((video, index) => (
              <li key={video._id} className="min-w-0">
                <VideoCard video={video} priority={first && index === 0} />
              </li>
            ))}
          </ul>
          <IndexPager
            page={page}
            totalPages={totalPages}
            hrefFor={(target) =>
              `${hrefFor({ ...query, [config.pageKey]: target })}#${config.id}`
            }
            ariaLabel={`${config.title} result pages`}
          />
        </>
      ) : (
        <p className="ed-lane__none">
          No {lane === "reel" ? "reels" : "landscape videos"} match the current
          filters.
        </p>
      )}
    </section>
  );
};

/**
 * The videos index (Phase 6): the lab switcher, the same GET form and chips as the articles index, then a
 * landscape lane (a grid of poster cards) and a reels lane (a vertical grid). A server component; the only
 * client code on the page is the player each card already carried.
 */
const VideosContentSection = ({
  landscape,
  reel,
  categories,
  query,
  initialError = false,
}: VideosContentSectionProps) => {
  const filtersActive = hasVideoDiscoveryFilters(query);
  const total = landscape.meta.total + reel.meta.total;
  const categoryName = categories.find(
    (category) => category.slug === query.category
  )?.name;
  const without = (patch: Partial<VideoDiscoveryQuery>) =>
    hrefFor({ ...query, ...patch, landscape_page: 1, reel_page: 1 });

  const chips: TIndexChip[] = [
    ...(query.search.trim()
      ? [
          {
            key: "search",
            label: "Search",
            value: query.search.trim(),
            href: without({ search: "" }),
          },
        ]
      : []),
    ...(query.category !== "all"
      ? [
          {
            key: "category",
            label: "Category",
            value: categoryName ?? query.category,
            href: without({ category: "all" }),
          },
        ]
      : []),
    ...(query.show !== "all"
      ? [
          {
            key: "show",
            label: "Shape",
            value: SHOW_LABELS[query.show],
            href: without({ show: "all" }),
          },
        ]
      : []),
  ];

  return (
    <section aria-label="Video results" className="ed-index">
      <div className="container">
        <LabSwitcher current="videos" />

        <IndexFilterForm
          action="/videos"
          legend="Filter and sort videos"
          search={{
            name: "search",
            label: "Search",
            value: query.search,
            placeholder: "Search by title, topic or keyword",
          }}
          selects={[
            {
              name: "category",
              label: "Category",
              value: query.category,
              options: [
                { value: "all", label: "All categories" },
                ...(query.category !== "all" && !categoryName
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
              name: "show",
              label: "Shape",
              value: query.show,
              options: Object.entries(SHOW_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            },
            {
              name: "sort",
              label: "Sort",
              value: query.sort,
              options: VIDEO_DISCOVERY_SORTS.map((sort) => ({
                value: sort,
                label: SORT_LABELS[sort],
              })),
            },
          ]}
          active={filtersActive}
          clearHref="/videos"
        />
        <IndexFilterChips chips={chips} />

        {initialError ? (
          <IndexNotice
            tone="error"
            title="Videos could not be loaded"
            description="The published library is temporarily unavailable. Please try again in a moment."
            action={{ href: hrefFor(query), label: "Try again" }}
          />
        ) : (
          <>
            <IndexCount total={total} noun="video" filtered={filtersActive} />
            {total === 0 ? (
              <IndexNotice
                tone="empty"
                title={
                  filtersActive
                    ? "No matching videos"
                    : "No published videos yet"
                }
                description={
                  filtersActive
                    ? "Try a broader category, shape or search phrase."
                    : "Published videos will appear here when they are ready."
                }
                action={
                  filtersActive
                    ? { href: "/videos", label: "Clear filters" }
                    : undefined
                }
              />
            ) : (
              <div className="ed-lanes">
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
                    first={
                      query.show === "reel" || landscape.items.length === 0
                    }
                  />
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default VideosContentSection;
