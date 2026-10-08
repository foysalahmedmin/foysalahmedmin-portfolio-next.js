// @vitest-environment jsdom

import { DiscoveryFilters } from "@/components/content/discovery-filters";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams("category=quick-explainers&reel_page=3&landscape_page=2"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => "/videos",
  useSearchParams: () => nav.params,
}));

const fields = [
  { type: "search", key: "search", label: "Search", value: "", placeholder: "Search" },
  {
    type: "select",
    key: "category",
    label: "Category",
    value: "quick-explainers",
    defaultValue: "all",
    options: [
      { value: "all", label: "All categories" },
      { value: "quick-explainers", label: "Quick explainers" },
      { value: "recommended-watching", label: "Recommended watching" },
    ],
  },
] as const;

const lastUrl = () => nav.replace.mock.calls.at(-1)![0] as string;

describe("DiscoveryFilters", () => {
  afterEach(cleanup);

  it("rewrites the URL on a select change and restarts every page counter", async () => {
    render(
      <DiscoveryFilters
        legend="Filter videos"
        fields={fields}
        resetKeys={["landscape_page", "reel_page"]}
        clearHref="/videos"
      />
    );
    await userEvent.setup().selectOptions(screen.getByLabelText("Category"), "recommended-watching");
    const url = new URL(lastUrl(), "http://x");
    expect(url.pathname).toBe("/videos");
    expect(url.searchParams.get("category")).toBe("recommended-watching");
    expect(url.searchParams.has("reel_page")).toBe(false);
    expect(url.searchParams.has("landscape_page")).toBe(false);
  });

  it("removes a filter that returns to its default instead of writing it", async () => {
    render(
      <DiscoveryFilters legend="Filter videos" fields={fields} resetKeys={["reel_page"]} />
    );
    await userEvent.setup().selectOptions(screen.getByLabelText("Category"), "all");
    expect(lastUrl()).toBe("/videos?landscape_page=2");
  });

  it("waits for typing to settle before navigating", async () => {
    nav.replace.mockClear();
    render(
      <DiscoveryFilters legend="Filter videos" fields={fields} resetKeys={["reel_page"]} />
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Search"), "n8n");
    expect(nav.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(nav.replace).toHaveBeenCalledTimes(1), { timeout: 2_000 });
    expect(new URL(lastUrl(), "http://x").searchParams.get("search")).toBe("n8n");
  });

  it("offers a way out only while a filter is active", () => {
    const { rerender } = render(
      <DiscoveryFilters legend="Filter" fields={fields} resetKeys={[]} clearHref="/videos" />
    );
    expect(screen.getByRole("link", { name: /clear filters/i })).toHaveAttribute("href", "/videos");
    rerender(
      <DiscoveryFilters
        legend="Filter"
        fields={fields.map((field) => (field.type === "select" ? { ...field, value: "all" } : field))}
        resetKeys={[]}
        clearHref="/videos"
      />
    );
    expect(screen.queryByRole("link", { name: /clear filters/i })).not.toBeInTheDocument();
  });
});
