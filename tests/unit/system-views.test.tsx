// @vitest-environment jsdom

import PublicRouteError from "@/app/(common)/error";
import { NotFoundView, RouteErrorView } from "@/components/pages/system-views";
import { ArchetypeSkeleton } from "@/components/templates/archetype-skeleton";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("NotFoundView", () => {
  afterEach(cleanup);

  it("is one A8 page with a single h1, a fixed Mono no-route line and a link home", () => {
    const { container } = render(<NotFoundView />);

    expect(container.querySelector("main")).toHaveAttribute(
      "data-archetype",
      "A8"
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("~/no-such-route: no route")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("hints at the command palette with both shortcuts as kbd", () => {
    const { container } = render(<NotFoundView />);
    const keys = Array.from(container.querySelectorAll("kbd")).map(
      (key) => key.textContent
    );
    expect(keys).toEqual(["⌘K", "Ctrl K"]);
  });

  it("leaves the hint out of the standalone page, where no palette is mounted", () => {
    const { container } = render(<NotFoundView fullHeight />);
    expect(container.querySelector("kbd")).toBeNull();
    expect(container.querySelector("main")).toHaveClass("min-h-dvh");
  });

  it("shows the maquette as a decorative lazy still for both themes", () => {
    const { container } = render(<NotFoundView />);
    const still = container.querySelector(".nr-still");
    expect(still).toHaveAttribute("aria-hidden", "true");
    const images = Array.from(still!.querySelectorAll("img"));
    expect(images.map((image) => image.getAttribute("src"))).toEqual([
      "/images/hero/maquette-dark-landscape.webp",
      "/images/hero/maquette-light-landscape.webp",
    ]);
    for (const image of images) {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("loading", "lazy");
    }
    expect(
      still!.querySelector('source[type="image/avif"]:not([media])')
    ).toHaveAttribute("srcset", "/images/hero/maquette-dark-landscape.avif");
  });
});

describe("RouteErrorView", () => {
  afterEach(cleanup);

  it("never renders the error message or the digest, and retries on request", async () => {
    const reset = vi.fn();
    const error = Object.assign(new Error("database exploded at node-7"), {
      digest: "secret-digest-123",
    });
    const { container } = render(
      <PublicRouteError error={error} reset={reset} />
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.textContent).not.toMatch(
      /database exploded|secret-digest/
    );
    expect(container.querySelector("main")).toHaveAttribute(
      "data-archetype",
      "A8"
    );
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute(
      "href",
      "/"
    );

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("is kept out of search results", () => {
    render(<RouteErrorView reset={() => undefined} />);
    // React hoists the tag into the document head
    expect(document.querySelector('meta[name="robots"]')).not.toBeNull();
  });
});

describe("ArchetypeSkeleton loading bar", () => {
  afterEach(cleanup);

  it("draws a decorative hairline bar and keeps its archetype shape and status", () => {
    const { container } = render(<ArchetypeSkeleton archetype="A5" />);
    const main = container.querySelector("main")!;
    const bar = main.querySelector(".nr-loadbar");

    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar?.querySelector("span")).not.toBeNull();
    expect(bar?.querySelector("[class*='spin']")).toBeNull();
    expect(main).toHaveAttribute("data-archetype", "A5");
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading content");
  });
});
