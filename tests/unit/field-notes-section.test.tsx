// @vitest-environment jsdom

import ArticlesSection from "@/components/(common)/home-page/articles-section";
import type { TArticleListItem } from "@/types/article.type";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

const article = (
  index: number,
  over: Record<string, unknown> = {}
): TArticleListItem =>
  ({
    _id: `id-${index}`,
    slug: `note-${index}`,
    name: `Note title ${index}`,
    description: `Description ${index}`,
    excerpt: `Takeaway ${index}`,
    reading_time_minutes: 3 + index,
    category: { name: `Category ${index}` },
    ...over,
  }) as unknown as TArticleListItem;

const articles = [0, 1, 2, 3].map((index) => article(index));

describe("ArticlesSection: layout notes (home field notes)", () => {
  it("is three hairline rows: title link, excerpt as the takeaway, mono metadata", () => {
    const { container } = render(
      <ArticlesSection articles={articles} layout="notes" />
    );
    const section = container.querySelector("section#articles")!;
    expect(section).toHaveAttribute("aria-labelledby", "articles-heading");
    expect(
      screen.getByRole("heading", { level: 2, name: "Field notes" })
    ).toBeInTheDocument();

    // The page asks for three; a fourth article is never shown
    const rows = within(section as HTMLElement).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(screen.queryByText("Note title 3")).toBeNull();

    rows.forEach((row, index) => {
      const title = within(row).getByRole("heading", {
        level: 3,
        name: `Note title ${index}`,
      });
      expect(within(title).getByRole("link")).toHaveAttribute(
        "href",
        `/articles/note-${index}`
      );
      expect(within(row).getByText(`Takeaway ${index}`)).toBeInTheDocument();
      const meta = row.querySelector(".field-note__meta")!;
      expect(meta).toHaveClass("t-eyebrow");
      expect(meta.textContent).toBe(`${3 + index} min readCategory ${index}`);
    });
  });

  it("falls back to the description, and to the pillar label when there is no category", () => {
    render(
      <ArticlesSection
        layout="notes"
        articles={[
          article(0, {
            excerpt: "",
            category: undefined,
            primary_pillar: "system_architect",
            reading_time_minutes: undefined,
          }),
        ]}
      />
    );
    expect(screen.getByText("Description 0")).toBeInTheDocument();
    expect(screen.getByText("System Architect")).toBeInTheDocument();
    expect(screen.queryByText(/min read/)).toBeNull();
  });

  it("links to the lab", () => {
    render(<ArticlesSection articles={articles} layout="notes" />);
    expect(screen.getByRole("link", { name: "Open the lab" })).toHaveAttribute(
      "href",
      "/projects"
    );
  });

  it("uses the heading from the page and carries no numerals", () => {
    const { container } = render(
      <ArticlesSection articles={articles} layout="notes" heading="Lab notes" />
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Lab notes" })
    ).toBeInTheDocument();
    expect(container.querySelector("ol")).toBeNull();
  });

  it("keeps the empty and unavailable states", () => {
    render(<ArticlesSection articles={[]} layout="notes" />);
    expect(
      screen.getByText("No approved public article is available yet")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open the lab" })).toBeNull();
    cleanup();
    render(<ArticlesSection articles={[]} layout="notes" unavailable />);
    expect(
      screen.getByText("Articles are temporarily unavailable")
    ).toBeInTheDocument();
  });
});

describe("ArticlesSection: the other layouts are unchanged", () => {
  it("renders the card grid with the browse link and read links up to six", () => {
    const six = Array.from({ length: 8 }, (_, index) => article(index));
    for (const layout of [undefined, "grid"]) {
      const { container } = render(
        <ArticlesSection articles={six} layout={layout} />
      );
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "Published technical writing",
        })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Browse articles/ })
      ).toHaveAttribute("href", "/articles");
      expect(container.querySelectorAll("article")).toHaveLength(6);
      expect(screen.queryByRole("link", { name: "Open the lab" })).toBeNull();
      expect(container.querySelector(".field-notes")).toBeNull();
      cleanup();
    }
  });

  it("keeps the same empty state", () => {
    render(<ArticlesSection articles={[]} />);
    expect(
      screen.getByText("No approved public article is available yet")
    ).toBeInTheDocument();
  });
});
