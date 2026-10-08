// @vitest-environment jsdom

import { CaseStudyCard } from "@/components/content/case-study-card";
import { VideoCard } from "@/components/content/video-card";
import { LinkPagination } from "@/components/ui/link-pagination";
import CaseStudyDetailsSection from "@/components/(common)/case-studies-page/case-study-details-section";
import VideosContentSection from "@/components/(common)/videos-page/videos-content-section";
import VideoDetailsSection from "@/components/(common)/videos-page/video-details-section";
import { PublicPageSections } from "@/components/pages/public-page-sections";
import { DEFAULT_VIDEO_DISCOVERY_QUERY } from "@/lib/discovery/video-discovery";
import type { TCaseStudyListItem, TPublicCaseStudy } from "@/types/case-study.type";
import type { TVideoListItem } from "@/types/video.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/video-player", () => ({
  VideoPlayerCore: (props: {
    src: string;
    title: string;
    orientation?: string;
    thumbnailSrc?: string;
  }) => (
    <div
      data-testid="player"
      data-src={props.src}
      data-orientation={props.orientation}
      data-poster={props.thumbnailSrc}
      aria-label={props.title}
    />
  ),
}));
vi.mock("@/components/ui/optimized-media", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));
vi.mock("@/components/motion/parallax-layer", () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/content/rich-content-renderer", () => ({
  RichContentRenderer: () => <div>Rendered body</div>,
}));
vi.mock("@/components/content/project-gallery", () => ({
  ProjectGallery: () => <div>Gallery</div>,
}));
vi.mock("@/components/content/discovery-filters", () => ({
  DiscoveryFilters: ({ legend }: { legend: string }) => <fieldset aria-label={legend} />,
}));

const video = (overrides: Partial<TVideoListItem> = {}): TVideoListItem => ({
  _id: "v1",
  name: "A video",
  slug: "a-video",
  description: "About it",
  aspect_ratio: "landscape",
  source_type: "youtube",
  youtube_id: "dQw4w9WgXcQ",
  is_featured: false,
  published_at: "2026-01-02T00:00:00.000Z",
  category: { _id: "c1", name: "Walkthroughs", slug: "walkthroughs" },
  ...overrides,
});

const lane = (items: TVideoListItem[], total = items.length) => ({
  items,
  meta: { total, page: 1, limit: 6 },
});

describe("VideoCard", () => {
  afterEach(cleanup);

  it("plays a YouTube video through its canonical URL in a frame of the right shape", () => {
    render(<VideoCard video={video({ aspect_ratio: "reel" })} />);
    const player = screen.getByTestId("player");
    expect(player).toHaveAttribute("data-src", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(player).toHaveAttribute("data-orientation", "reel");
    expect(player).toHaveAttribute("data-poster", "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(screen.getByRole("link", { name: "A video" })).toHaveAttribute("href", "/videos/a-video");
  });

  it("plays an uploaded file and prefers the uploaded thumbnail", () => {
    render(
      <VideoCard
        video={video({
          source_type: "upload",
          youtube_id: undefined,
          video_file: { _id: "f1", url: "https://res.cloudinary.com/x/video/upload/a.mp4", filename: "a", mimetype: "video/mp4", size: 1, provider: "cloudinary" },
          thumbnail: { _id: "t1", url: "https://res.cloudinary.com/x/image/upload/a.webp", filename: "a", mimetype: "image/webp", size: 1, provider: "cloudinary" },
        })}
      />
    );
    const player = screen.getByTestId("player");
    expect(player).toHaveAttribute("data-src", "https://res.cloudinary.com/x/video/upload/a.mp4");
    expect(player).toHaveAttribute("data-poster", "https://res.cloudinary.com/x/image/upload/a.webp");
  });

  it("renders nothing for a video that cannot play", () => {
    const { container } = render(<VideoCard video={video({ youtube_id: undefined })} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Videos page", () => {
  afterEach(cleanup);

  const props = {
    categories: [],
    query: DEFAULT_VIDEO_DISCOVERY_QUERY,
  };

  it("keeps landscape videos and reels in separate sections", () => {
    const { container } = render(
      <VideosContentSection
        {...props}
        landscape={lane([video({ _id: "l1" }), video({ _id: "l2", slug: "l2" })])}
        reel={lane([video({ _id: "r1", slug: "r1", aspect_ratio: "reel" })])}
      />
    );
    const landscape = container.querySelector('[data-video-lane="landscape"]')!;
    const reels = container.querySelector('[data-video-lane="reel"]')!;
    expect(within(landscape as HTMLElement).getAllByTestId("player")).toHaveLength(2);
    expect(within(reels as HTMLElement).getAllByTestId("player")).toHaveLength(1);
    for (const player of within(landscape as HTMLElement).getAllByTestId("player")) {
      expect(player).toHaveAttribute("data-orientation", "landscape");
    }
    expect(within(reels as HTMLElement).getByTestId("player")).toHaveAttribute("data-orientation", "reel");
    expect(screen.getByRole("heading", { name: "Landscape videos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reels" })).toBeInTheDocument();
  });

  it("hides a lane that has no videos instead of showing an empty frame", () => {
    const { container } = render(
      <VideosContentSection {...props} landscape={lane([video()])} reel={lane([])} />
    );
    expect(container.querySelector('[data-video-lane="reel"]')).toBeNull();
    expect(container.querySelector('[data-video-lane="landscape"]')).not.toBeNull();
  });

  it("shows an empty state, and a retry-friendly one on error", () => {
    const { rerender } = render(
      <VideosContentSection {...props} landscape={lane([])} reel={lane([])} />
    );
    expect(screen.getByText("No published videos yet")).toBeInTheDocument();
    rerender(
      <VideosContentSection
        {...props}
        query={{ ...DEFAULT_VIDEO_DISCOVERY_QUERY, search: "zzz" }}
        landscape={lane([])}
        reel={lane([])}
      />
    );
    expect(screen.getByText("No matching videos")).toBeInTheDocument();
    rerender(
      <VideosContentSection {...props} landscape={lane([])} reel={lane([])} initialError />
    );
    expect(screen.getByText("Videos could not be loaded")).toBeInTheDocument();
  });

  it("paginates each lane with its own page counter and keeps the filters", () => {
    render(
      <VideosContentSection
        categories={[]}
        query={{ ...DEFAULT_VIDEO_DISCOVERY_QUERY, search: "n8n", reel_page: 2 }}
        landscape={{ items: [video()], meta: { total: 14, page: 1, limit: 6 } }}
        reel={{ items: [video({ _id: "r", aspect_ratio: "reel" })], meta: { total: 20, page: 2, limit: 8 } }}
      />
    );
    const landscapeNav = screen.getByRole("navigation", { name: "Landscape videos result pages" });
    const next = within(landscapeNav).getByRole("link", { name: "Page 2" });
    expect(next.getAttribute("href")).toContain("landscape_page=2");
    expect(next.getAttribute("href")).toContain("search=n8n");
    expect(next.getAttribute("href")).toContain("reel_page=2");
    expect(next.getAttribute("href")).toMatch(/#landscape-videos$/);
    const reelNav = screen.getByRole("navigation", { name: "Reels result pages" });
    expect(within(reelNav).getByRole("link", { name: "Page 3" }).getAttribute("href")).toContain("reel_page=3");
  });
});

describe("Video detail", () => {
  afterEach(cleanup);

  it("frames a reel narrow and a landscape video wide", () => {
    const { container, rerender } = render(
      <VideoDetailsSection video={video({ aspect_ratio: "reel" })} related={[]} />
    );
    expect(container.querySelector('[data-video-shape="reel"]')).not.toBeNull();
    expect(screen.getByTestId("player")).toHaveAttribute("data-orientation", "reel");
    expect(screen.getByTestId("player").parentElement?.className).toContain("max-w-sm");
    rerender(<VideoDetailsSection video={video()} related={[]} />);
    expect(screen.getByTestId("player").parentElement?.className).toContain("max-w-5xl");
  });

  it("lists keywords and related videos of the same shape", () => {
    render(
      <VideoDetailsSection
        video={video({ keywords: ["architecture"] })}
        related={[video({ _id: "v2", slug: "v2", name: "Related one" })]}
      />
    );
    expect(screen.getByText("architecture")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "More videos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Related one" })).toBeInTheDocument();
  });
});

describe("Page sections for the libraries", () => {
  afterEach(cleanup);

  const payload = (sections: unknown[]) =>
    ({
      page: { route_key: "home", route_path: "/" },
      site: { fallbacks: {}, content_source: "published", contact: {}, pillars: [] },
      sections,
    }) as never;

  const section = (key: string, kind: string, items: unknown[], filter?: Record<string, string>) => ({
    key,
    kind,
    layout: "grid",
    source_mode: "automatic",
    ...(filter ? { source_filter: filter } : {}),
    items,
    health: { status: "healthy", requested_records: 3, resolved_records: items.length, omitted_records: 0, reason_codes: [] },
  });

  it("renders one lane per video section, never mixing shapes", () => {
    const { container } = render(
      <PublicPageSections
        payload={payload([
          section("videos", "video-collection", [video(), video({ _id: "r", aspect_ratio: "reel" })], { aspect_ratio: "landscape" }),
          section("reels", "video-collection", [video(), video({ _id: "r", slug: "r", aspect_ratio: "reel" })], { aspect_ratio: "reel" }),
        ])}
      />
    );
    const landscape = container.querySelector('[data-video-lane="landscape"]')!;
    const reels = container.querySelector('[data-video-lane="reel"]')!;
    expect(within(landscape as HTMLElement).getAllByTestId("player")).toHaveLength(1);
    expect(within(reels as HTMLElement).getAllByTestId("player")).toHaveLength(1);
    expect(within(reels as HTMLElement).getByTestId("player")).toHaveAttribute("data-orientation", "reel");
  });

  it("renders the case study cards and an honest message when none are available", () => {
    const study: TCaseStudyListItem = { _id: "c1", slug: "story", name: "A story", description: "Summary", is_featured: true, outcomes: [] };
    const { rerender } = render(
      <PublicPageSections payload={payload([section("case-studies", "case-study-collection", [study])])} />
    );
    expect(screen.getByRole("link", { name: "A story" })).toHaveAttribute("href", "/case-studies/story");
    rerender(
      <PublicPageSections payload={payload([section("case-studies", "case-study-collection", [])])} />
    );
    expect(screen.getByText("No published case study is available yet")).toBeInTheDocument();
  });
});

describe("CaseStudyCard", () => {
  afterEach(cleanup);

  it("shows the first outcome, industry and tools", () => {
    render(
      <CaseStudyCard
        caseStudy={{
          _id: "c1",
          slug: "story",
          name: "A story",
          is_featured: false,
          client_industry: "Publishing",
          duration_label: "8 weeks",
          tech_stack: ["Next.js", "MongoDB", "Zod", "Tailwind", "Extra"],
          outcomes: [{ label: "fewer hand-offs", value: "None", verification_state: "derived" }],
          primary_pillar: "system_architect",
        }}
      />
    );
    expect(screen.getByText("fewer hand-offs")).toBeInTheDocument();
    expect(screen.getByText("Publishing")).toBeInTheDocument();
    expect(screen.queryByText("Extra")).not.toBeInTheDocument();
    expect(screen.getByText("System Architect")).toBeInTheDocument();
  });
});

describe("Case study detail", () => {
  afterEach(cleanup);

  const study = (overrides: Partial<TPublicCaseStudy> = {}): TPublicCaseStudy => ({
    _id: "c1",
    name: "A story",
    slug: "story",
    description: "Summary",
    challenge: "The problem",
    approach: "The approach",
    solution: "The solution",
    is_featured: false,
    ...overrides,
  });

  it("numbers only the sections that are shown, in reading order", () => {
    const { container } = render(
      <CaseStudyDetailsSection
        caseStudy={study({ results_summary: "It worked", learnings: ["Keep it small"] })}
        related={[]}
      />
    );
    const eyebrows = Array.from(container.querySelectorAll("section > p")).map((node) => node.textContent);
    expect(eyebrows).toEqual([
      "01 · The challenge",
      "02 · Approach",
      "03 · Solution",
      "04 · Impact",
      "05 · Reflection",
    ]);
  });

  it("shows the client only when the public payload carries it, and only safe links", () => {
    const { rerender } = render(
      <CaseStudyDetailsSection caseStudy={study()} related={[]} />
    );
    expect(screen.queryByText("Client")).not.toBeInTheDocument();
    rerender(
      <CaseStudyDetailsSection
        caseStudy={study({
          client_name: "Acme Ltd",
          live_url: "http://localhost:3000/preview",
          source_url: "https://github.com/x/y",
        })}
        related={[]}
      />
    );
    expect(screen.getByText("Acme Ltd")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open live product/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view public source/i })).toHaveAttribute("href", "https://github.com/x/y");
  });
});

describe("LinkPagination", () => {
  afterEach(cleanup);

  it("renders nothing for a single page and marks the current page otherwise", () => {
    const { container, rerender } = render(
      <LinkPagination page={1} totalPages={1} hrefFor={(p) => `?page=${p}`} ariaLabel="Pages" />
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<LinkPagination page={3} totalPages={9} hrefFor={(p) => `?page=${p}`} ariaLabel="Pages" />);
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "?page=2");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("href", "?page=4");
    expect(screen.getByRole("link", { name: "Page 9" })).toBeInTheDocument();
  });
});
