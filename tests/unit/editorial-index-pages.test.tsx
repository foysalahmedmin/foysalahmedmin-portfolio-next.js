// @vitest-environment jsdom

import ArticleDetailsSection, {
  buildArticleHeader,
} from "@/components/(common)/articles-page/article-details-section";
import ArticlesContentSection from "@/components/(common)/articles-page/articles-content-section";
import VideoDetailsSection, {
  buildVideoHeader,
} from "@/components/(common)/videos-page/video-details-section";
import VideosContentSection from "@/components/(common)/videos-page/videos-content-section";
import { VideoCard } from "@/components/content/video-card";
import { getPublicRouteHeader } from "@/components/pages/public-route-page";
import { getPillarLabel } from "@/lib/content/pillars";
import {
  parseArticleDiscoveryQuery,
  type ArticleDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import {
  DEFAULT_VIDEO_DISCOVERY_QUERY,
  type VideoDiscoveryQuery,
} from "@/lib/discovery/video-discovery";
import type { TArticleListItem, TPublicArticle } from "@/types/article.type";
import type { TVideoListItem } from "@/types/video.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readImports } from "../helpers/import-graph";

vi.mock("@/components/ui/video-player", () => ({
  VideoPlayerCore: (props: {
    src: string;
    title: string;
    orientation?: string;
    className?: string;
  }) => (
    <div
      data-testid="player"
      data-src={props.src}
      data-orientation={props.orientation}
      className={props.className}
      aria-label={props.title}
    />
  ),
}));
vi.mock("@/components/ui/optimized-media", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));
vi.mock("@/components/content/share-button", () => ({
  default: ({ title }: { title: string }) => <button>Share {title}</button>,
}));
vi.mock("@/components/content/rich-content-renderer", () => ({
  RichContentRenderer: ({ className }: { className?: string }) => (
    <div data-testid="body" className={className}>
      Rendered body
    </div>
  ),
}));

const article: TArticleListItem = {
  _id: "article-id",
  slug: "safe-boundaries",
  name: "Safe boundaries",
  excerpt: "A practical guide to explicit trust boundaries.",
  author: { _id: "author-id", name: "Foysal Ahmed" },
  category: { _id: "cat-id", name: "Security", slug: "security" },
  primary_pillar: "system_architect",
  topics: ["Threat modeling"],
  reading_time_minutes: 8,
  published_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-02-01T00:00:00.000Z",
  is_featured: true,
  is_premium: false,
};

const meta = (total: number, limit = 9) => ({ total, page: 1, limit });

const renderArticles = (
  overrides: Partial<Parameters<typeof ArticlesContentSection>[0]> = {},
  query: Partial<ArticleDiscoveryQuery> = {}
) =>
  render(
    <ArticlesContentSection
      initialArticles={[article]}
      initialMeta={meta(1)}
      initialQuery={{ ...parseArticleDiscoveryQuery({}), ...query }}
      categories={[
        { _id: "cat-id", name: "Security", slug: "security" } as never,
      ]}
      facets={{ topics: ["Threat modeling", "Security"] }}
      {...overrides}
    />
  );

describe("Articles index", () => {
  afterEach(cleanup);

  it("renders hairline rows with a Display title, a takeaway and Mono metadata", () => {
    const { container } = renderArticles();
    const rows = container.querySelectorAll("ol.ed-rows > li.ed-row");
    expect(rows).toHaveLength(1);
    const row = within(rows[0] as HTMLElement);
    expect(
      row.getByRole("heading", { level: 3, name: "Safe boundaries" })
    ).toBeInTheDocument();
    expect(row.getByRole("link", { name: "Safe boundaries" })).toHaveAttribute(
      "href",
      "/articles/safe-boundaries"
    );
    expect(
      row.getByText("A practical guide to explicit trust boundaries.")
    ).toBeInTheDocument();
    expect(
      row.getByText(getPillarLabel("system_architect"))
    ).toBeInTheDocument();
    expect(row.getByText("Security")).toBeInTheDocument();
    expect(row.getByText("Featured")).toBeInTheDocument();
    expect(row.getByText("8 min read").closest("dd")).toBeInTheDocument();
    expect(row.getByText("Foysal Ahmed")).toBeInTheDocument();
    expect(row.getByText("Jan 1, 2025")).toBeInTheDocument();
    expect(row.getByText("Feb 1, 2025").closest("dd")).toHaveTextContent(
      "Updated Feb 1, 2025"
    );
    expect(
      within(row.getByRole("list", { name: "Article topics" })).getByText(
        "Threat modeling"
      )
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the lab switcher with Articles current", () => {
    renderArticles();
    const nav = screen.getByRole("navigation", { name: "The lab" });
    expect(within(nav).getByRole("link", { name: "Articles" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      within(nav).getByRole("link", { name: "Projects" })
    ).not.toHaveAttribute("aria-current");
    expect(
      within(nav).getByRole("link", { name: "Videos" })
    ).not.toHaveAttribute("aria-current");
  });

  it("filters with a GET form that carries the URL-backed contract", () => {
    const { container } = renderArticles(
      {},
      {
        search: "queue",
        pillar: "system_architect",
        category: "security",
        topic: "Security",
        sort: "oldest",
      }
    );
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/articles");
    expect(form).toHaveAttribute("role", "search");
    const field = (name: string) =>
      form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    expect(field("search").value).toBe("queue");
    expect(field("pillar").value).toBe("system_architect");
    expect(field("category").value).toBe("security");
    expect(field("topic").value).toBe("Security");
    expect(field("sort").value).toBe("oldest");
    expect(within(form).getByRole("button", { name: "Apply" })).toHaveAttribute(
      "type",
      "submit"
    );
    expect(
      within(form).getByRole("link", { name: "Clear filters" })
    ).toHaveAttribute("href", "/articles");
    expect(
      within(form).getByRole("combobox", { name: "Role" })
    ).toBeInTheDocument();
  });

  it("shows no Clear link and no chips while nothing is filtered", () => {
    const { container } = renderArticles();
    expect(
      within(container.querySelector("form")!).queryByRole("link", {
        name: "Clear filters",
      })
    ).toBeNull();
    expect(screen.queryByRole("list", { name: "Active filters" })).toBeNull();
    expect(screen.getByText("1 article available")).toBeInTheDocument();
  });

  it("offers one removable chip per active filter, as links that keep the others", () => {
    renderArticles(
      {},
      {
        search: "queue",
        pillar: "system_architect",
        topic: "Security",
        page: 2,
      }
    );
    const chips = screen.getByRole("list", { name: "Active filters" });
    expect(within(chips).getAllByRole("link")).toHaveLength(3);
    expect(
      within(chips).getByRole("link", { name: "Remove filter Topic: Security" })
    ).toHaveAttribute("href", "/articles?search=queue&pillar=system_architect");
    expect(
      within(chips).getByRole("link", {
        name: `Remove filter Role: ${getPillarLabel("system_architect")}`,
      })
    ).toHaveAttribute("href", "/articles?search=queue&topic=Security");
    expect(
      within(chips).getByRole("link", { name: "Remove filter Search: queue" })
    ).toHaveAttribute(
      "href",
      "/articles?pillar=system_architect&topic=Security"
    );
    expect(
      screen.getByText("1 article match the current filters")
    ).toBeInTheDocument();
  });

  it("paginates with plain links that keep the filters and return to the results", () => {
    renderArticles(
      { initialMeta: { total: 20, page: 2, limit: 9 } },
      { search: "queue", page: 2 }
    );
    const nav = screen.getByRole("navigation", {
      name: "Article result pages",
    });
    expect(within(nav).getByText("Page 2 of 3")).toHaveAttribute(
      "aria-current",
      "page"
    );
    const previous = within(nav).getByRole("link", { name: "Previous" });
    expect(previous).toHaveAttribute(
      "href",
      "/articles?search=queue#article-results"
    );
    expect(previous).toHaveAttribute("rel", "prev");
    const next = within(nav).getByRole("link", { name: "Next" });
    expect(next).toHaveAttribute(
      "href",
      "/articles?search=queue&page=3#article-results"
    );
    expect(next).toHaveAttribute("rel", "next");
  });

  it("has no pagination for a single page", () => {
    renderArticles();
    expect(
      screen.queryByRole("navigation", { name: "Article result pages" })
    ).toBeNull();
  });

  it("distinguishes a filtered no-match state from an empty library and from a failed read", () => {
    const { rerender } = renderArticles(
      { initialArticles: [], initialMeta: meta(0) },
      { topic: "Security" }
    );
    expect(
      screen.getByRole("heading", { name: "No matching articles" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Clear filters" })).toHaveLength(
      2
    );
    expect(
      screen.getByText("0 articles match the current filters")
    ).toBeInTheDocument();

    rerender(
      <ArticlesContentSection
        initialArticles={[]}
        initialMeta={meta(0)}
        initialQuery={parseArticleDiscoveryQuery({})}
        categories={[]}
        facets={{ topics: [] }}
      />
    );
    expect(
      screen.getByRole("heading", { name: "No published articles yet" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear filters" })).toBeNull();

    rerender(
      <ArticlesContentSection
        initialArticles={[]}
        initialMeta={meta(0)}
        initialQuery={parseArticleDiscoveryQuery({})}
        categories={[]}
        facets={{ topics: [] }}
        initialError
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Articles could not be loaded"
    );
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/articles"
    );
  });

  it("keeps a filter value the lists do not know selectable", () => {
    const { container } = renderArticles(
      {},
      { category: "retired", topic: "Legacy" }
    );
    const form = container.querySelector("form")!;
    expect(
      within(form).getByRole("option", {
        name: "Unavailable category: retired",
      })
    ).toBeInTheDocument();
    expect(
      within(form).getByRole("option", { name: "Legacy" })
    ).toBeInTheDocument();
  });
});

const PLAYER = "src/components/ui/video-player.tsx";

/** Files reachable through static imports; `stopAt` is included but not followed. */
const staticClosure = (root: string, stopAt?: string) => {
  const seen = new Set<string>();
  const queue = [root];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (file === stopAt) continue;
    for (const edge of readImports(file)) {
      if (!edge.dynamic && edge.target) queue.push(edge.target);
    }
  }
  return seen;
};

const isClientModule = (file: string) =>
  /^\s*(?:\/\*[\s\S]*?\*\/\s*)?["']use client["']/.test(
    readFileSync(join(process.cwd(), file), "utf8")
  );

describe("the index content sections ship no client JavaScript of their own", () => {
  const sections = [
    "src/components/(common)/articles-page/articles-content-section/index.tsx",
    "src/components/(common)/videos-page/videos-content-section/index.tsx",
  ];

  it.each(sections)("%s is not a client module", (file) => {
    expect(isClientModule(file)).toBe(false);
  });

  it("the articles section reaches no client module at all", () => {
    const clients = [
      ...staticClosure(
        "src/components/(common)/articles-page/articles-content-section/index.tsx"
      ),
    ].filter(isClientModule);
    expect(clients).toEqual([]);
  });

  it("the videos section reaches the player (and what it loads) and no other client module", () => {
    const clients = [
      ...staticClosure(
        "src/components/(common)/videos-page/videos-content-section/index.tsx",
        PLAYER
      ),
    ].filter(isClientModule);
    expect(clients).toEqual([PLAYER]);
  });
});

const articleDetail: TPublicArticle = {
  ...article,
  content:
    "<h2>The boundary</h2><p>First.</p><h2>The check</h2><h3>Detail</h3><p>Second.</p>",
  tags: ["Threat modeling", "Zero trust"],
  is_featured: false,
};

describe("Article detail", () => {
  afterEach(cleanup);

  it("renders the reading progress hairline once, and only here", () => {
    const { container } = render(
      <ArticleDetailsSection article={articleDetail} related={[]} />
    );
    expect(container.querySelectorAll(".reading-progress")).toHaveLength(1);
    cleanup();
    const index = renderArticles();
    expect(index.container.querySelector(".reading-progress")).toBeNull();
    cleanup();
    const video = render(
      <VideoDetailsSection video={videoItem()} related={[]} />
    );
    expect(video.container.querySelector(".reading-progress")).toBeNull();
  });

  it("hands the body to the sanitised renderer, retuned to the page's own aside", () => {
    render(<ArticleDetailsSection article={articleDetail} related={[]} />);
    expect(screen.getByTestId("body")).toHaveClass("ed-body");
  });

  it("builds a sticky aside with the spec sheet, topics, contents and sharing", () => {
    const { container } = render(
      <ArticleDetailsSection article={articleDetail} related={[]} />
    );
    const aside = within(
      screen.getByRole("complementary", { name: "About this article" })
    );
    expect(container.querySelector(".ed-aside")).not.toBeNull();
    expect(aside.getByText("Foysal Ahmed")).toBeInTheDocument();
    expect(
      aside.getByText(getPillarLabel("system_architect"))
    ).toBeInTheDocument();
    expect(aside.getByText("Security")).toBeInTheDocument();
    expect(aside.getByText("Zero trust")).toBeInTheDocument();
    const toc = within(aside.getByRole("navigation", { name: "On this page" }));
    expect(toc.getByRole("link", { name: "The boundary" })).toHaveAttribute(
      "href",
      "#the-boundary"
    );
    expect(toc.getByRole("link", { name: "Detail" })).toHaveAttribute(
      "href",
      "#detail"
    );
    expect(
      aside.getByRole("button", { name: "Share Safe boundaries" })
    ).toBeInTheDocument();
  });

  it("shows related articles as the same hairline rows", () => {
    const { container } = render(
      <ArticleDetailsSection
        article={articleDetail}
        related={[
          { ...article, _id: "other", slug: "other", name: "Another note" },
        ]}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Continue reading" })
    ).toBeInTheDocument();
    expect(container.querySelectorAll(".ed-related li.ed-row")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Another note" })).toHaveAttribute(
      "href",
      "/articles/other"
    );
  });

  it("builds the shared page header: path, title, excerpt as lede, Mono meta", () => {
    const header = buildArticleHeader(articleDetail);
    expect(header.title).toBe("Safe boundaries");
    expect(header.lede).toBe("A practical guide to explicit trust boundaries.");
    expect(header.path?.map((item) => item.name)).toEqual([
      "Home",
      "Articles",
      "safe-boundaries",
    ]);
    expect(header.path?.[1]).toMatchObject({ href: "/articles" });
    const { container } = render(<div>{header.meta}</div>);
    expect(container.querySelector("time")).toHaveTextContent(
      "January 1, 2025"
    );
    expect(container).toHaveTextContent("8 min read");
  });
});

const videoItem = (
  overrides: Partial<TVideoListItem> = {}
): TVideoListItem => ({
  _id: "v1",
  name: "A video",
  slug: "a-video",
  description: "About it",
  aspect_ratio: "landscape",
  source_type: "youtube",
  youtube_id: "dQw4w9WgXcQ",
  duration_seconds: 185,
  is_featured: false,
  published_at: "2026-01-02T00:00:00.000Z",
  category: { _id: "c1", name: "Walkthroughs", slug: "walkthroughs" },
  ...overrides,
});

const lane = (items: TVideoListItem[], total = items.length, limit = 6) => ({
  items,
  meta: { total, page: 1, limit },
});

const renderVideos = (
  landscape = lane([videoItem()]),
  reel = lane([]),
  query: Partial<VideoDiscoveryQuery> = {},
  categories: Parameters<typeof VideosContentSection>[0]["categories"] = [
    { _id: "c1", name: "Walkthroughs", slug: "walkthroughs" } as never,
  ]
) =>
  render(
    <VideosContentSection
      landscape={landscape}
      reel={reel}
      categories={categories}
      query={{ ...DEFAULT_VIDEO_DISCOVERY_QUERY, ...query }}
    />
  );

describe("Videos index", () => {
  afterEach(cleanup);

  it("is headed Recommended watching by the route header", () => {
    const header = getPublicRouteHeader({
      page: { route_key: "videos", route_path: "/videos", seo: {} },
      site: { positioning: {} },
    } as never);
    expect(header?.title).toBe("Recommended watching");
  });

  it("renders the lab switcher with Videos current", () => {
    renderVideos();
    const nav = screen.getByRole("navigation", { name: "The lab" });
    expect(within(nav).getByRole("link", { name: "Videos" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("puts a Mono duration chip on a greyscale poster", () => {
    const { container } = renderVideos();
    const poster = container.querySelector(".ed-poster")!;
    expect(poster.querySelector(".ed-poster__player")).toBe(
      screen.getByTestId("player")
    );
    const chip = poster.querySelector(".ed-duration")!;
    expect(chip).toHaveClass("t-eyebrow", "t-mono");
    expect(chip).toHaveTextContent("Duration 3:05");
    expect(chip.querySelector(".sr-only")).toHaveTextContent("Duration");
    const css = readFileSync(
      join(process.cwd(), "src/assets/styles/public/pages-editorial.css"),
      "utf8"
    );
    expect(css).toMatch(
      /\.ed-poster__player\s*\{[^}]*filter:\s*grayscale\(1\)/
    );
  });

  it("shows no duration chip when the duration is unknown", () => {
    const { container } = render(
      <VideoCard video={videoItem({ duration_seconds: undefined })} />
    );
    expect(container.querySelector(".ed-duration")).toBeNull();
  });

  it("lays landscape posters out as a grid and reels as a vertical grid", () => {
    const { container } = renderVideos(
      lane([videoItem({ _id: "l1" }), videoItem({ _id: "l2", slug: "l2" })]),
      lane([videoItem({ _id: "r1", slug: "r1", aspect_ratio: "reel" })], 1, 8)
    );
    const landscape = container.querySelector(
      '[data-video-lane="landscape"] ul'
    )!;
    const reels = container.querySelector('[data-video-lane="reel"] ul')!;
    expect(landscape.className).toContain("md:grid-cols-2");
    expect(reels.className).toContain("grid-cols-2");
    expect(
      within(landscape as HTMLElement).getAllByTestId("player")
    ).toHaveLength(2);
    expect(within(reels as HTMLElement).getByTestId("player")).toHaveAttribute(
      "data-orientation",
      "reel"
    );
    expect(screen.getByText("3 videos available")).toBeInTheDocument();
  });

  it("filters with the same GET form and removable chips", () => {
    const { container } = renderVideos(lane([videoItem()]), lane([]), {
      search: "n8n",
      category: "walkthroughs",
      show: "landscape",
      sort: "oldest",
    });
    const form = container.querySelector("form") as HTMLFormElement;
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/videos");
    const field = (name: string) =>
      form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
    expect(field("search").value).toBe("n8n");
    expect(field("category").value).toBe("walkthroughs");
    expect(field("show").value).toBe("landscape");
    expect(field("sort").value).toBe("oldest");
    expect(
      within(form).getByRole("button", { name: "Apply" })
    ).toBeInTheDocument();
    expect(
      within(form).getByRole("link", { name: "Clear filters" })
    ).toHaveAttribute("href", "/videos");
    const chips = screen.getByRole("list", { name: "Active filters" });
    expect(
      within(chips).getByRole("link", {
        name: "Remove filter Shape: Landscape only",
      })
    ).toHaveAttribute(
      "href",
      "/videos?search=n8n&category=walkthroughs&sort=oldest"
    );
    expect(
      within(chips).getByRole("link", {
        name: "Remove filter Category: Walkthroughs",
      })
    ).toHaveAttribute("href", "/videos?search=n8n&show=landscape&sort=oldest");
    expect(
      within(chips).getByRole("link", { name: "Remove filter Search: n8n" })
    ).toHaveAttribute(
      "href",
      "/videos?category=walkthroughs&show=landscape&sort=oldest"
    );
  });

  it("paginates each lane with plain links that keep the filters and the other lane", () => {
    renderVideos(
      lane([videoItem()], 14, 6),
      lane([videoItem({ _id: "r", aspect_ratio: "reel" })], 20, 8),
      { search: "n8n", reel_page: 2 }
    );
    const landscape = screen.getByRole("navigation", {
      name: "Landscape videos result pages",
    });
    const next = within(landscape).getByRole("link", { name: "Next" });
    expect(next.getAttribute("href")).toBe(
      "/videos?search=n8n&landscape_page=2&reel_page=2#landscape-videos"
    );
    const reels = screen.getByRole("navigation", {
      name: "Reels result pages",
    });
    expect(within(reels).getByText("Page 2 of 3")).toBeInTheDocument();
    expect(
      within(reels).getByRole("link", { name: "Previous" }).getAttribute("href")
    ).toBe("/videos?search=n8n#reels");
  });

  it("explains an empty, a filtered-empty and a failed library", () => {
    const { rerender } = renderVideos(lane([]), lane([]));
    expect(
      screen.getByRole("heading", { name: "No published videos yet" })
    ).toBeInTheDocument();
    const again = (query: Partial<VideoDiscoveryQuery>, initialError = false) =>
      rerender(
        <VideosContentSection
          landscape={lane([])}
          reel={lane([])}
          categories={[]}
          query={{ ...DEFAULT_VIDEO_DISCOVERY_QUERY, ...query }}
          initialError={initialError}
        />
      );
    again({ search: "zzz" });
    expect(
      screen.getByRole("heading", { name: "No matching videos" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Clear filters" })).toHaveLength(
      2
    );
    again({}, true);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Videos could not be loaded"
    );
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/videos"
    );
  });

  it("keeps a focused lane visible with its own note when it has no matches", () => {
    const { container } = renderVideos(
      lane([]),
      lane([videoItem({ _id: "r", aspect_ratio: "reel" })], 1, 16),
      { show: "landscape" }
    );
    expect(container.querySelector('[data-video-lane="reel"]')).toBeNull();
    expect(
      screen.getByText("No landscape videos match the current filters.")
    ).toBeInTheDocument();
  });
});

describe("Video detail", () => {
  afterEach(cleanup);

  it("frames the player in a hairline box and keeps the unavailable state", () => {
    const { container, rerender } = render(
      <VideoDetailsSection video={videoItem()} related={[]} />
    );
    const player = screen.getByTestId("player");
    expect(player).toHaveClass("ed-poster__player");
    expect(player.parentElement).toHaveClass("ed-frame");
    expect(
      container.querySelector('[data-video-shape="landscape"]')
    ).not.toBeNull();
    rerender(
      <VideoDetailsSection
        video={videoItem({ youtube_id: undefined })}
        related={[]}
      />
    );
    expect(
      screen.getByText("This video is not available right now.")
    ).toBeInTheDocument();
  });

  it("puts category, shape and keywords in the aside and the description in the column", () => {
    render(
      <VideoDetailsSection
        video={videoItem({ keywords: ["architecture"], aspect_ratio: "reel" })}
        related={[]}
      />
    );
    const aside = within(
      screen.getByRole("complementary", { name: "About this video" })
    );
    expect(aside.getByText("Walkthroughs")).toBeInTheDocument();
    expect(aside.getByText("Reel (9:16)")).toBeInTheDocument();
    expect(
      aside.getByRole("list", { name: "Video keywords" })
    ).toHaveTextContent("architecture");
    expect(screen.getByText("About it")).toHaveClass("ed-description");
  });

  it("lists related videos as poster cards of the same shape", () => {
    render(
      <VideoDetailsSection
        video={videoItem()}
        related={[videoItem({ _id: "v2", slug: "v2", name: "Related one" })]}
      />
    );
    expect(
      screen.getByRole("heading", { name: "More videos" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Related one" })).toHaveAttribute(
      "href",
      "/videos/v2"
    );
  });

  it("builds the shared page header with a Mono date and duration", () => {
    const header = buildVideoHeader(videoItem());
    expect(header.title).toBe("A video");
    expect(header.path?.map((item) => item.name)).toEqual([
      "Home",
      "Videos",
      "a-video",
    ]);
    const { container } = render(<div>{header.meta as ReactNode}</div>);
    expect(container.querySelector("time")).toHaveTextContent(
      "January 2, 2026"
    );
    expect(container).toHaveTextContent("Duration 3:05");
  });

  it("has no CtaBand of its own: the template supplies it", () => {
    const { container } = render(
      <VideoDetailsSection video={videoItem()} related={[]} />
    );
    expect(container).not.toHaveTextContent("Have a problem like this one?");
  });
});
