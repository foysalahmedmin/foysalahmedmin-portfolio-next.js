// @vitest-environment jsdom

import { useUrlListQueryState } from "@/hooks/ui/use-url-list-query-state";
import { parseProjectDiscoveryQuery } from "@/lib/discovery/public-discovery";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("public discovery browser history", () => {
  beforeEach(() => {
    window.history.replaceState(
      { source: "test" },
      "",
      "/projects?utm_source=profile&pillar=backend"
    );
  });

  afterEach(() => {
    cleanup();
    document.documentElement
      .querySelector("[data-page-preview-runtime]")
      ?.remove();
    vi.restoreAllMocks();
  });

  it("replaces search typing, pushes discrete filters, and restores popstate", async () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() =>
      useUrlListQueryState(
        "projects",
        parseProjectDiscoveryQuery({ pillar: "backend" })
      )
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.query.pillar).toBe("backend");

    act(() => {
      result.current.setQuery(
        { search: "distributed systems", page: 1 },
        { history: "replace" }
      );
    });
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(window.location.search).toContain("search=distributed+systems");
    expect(window.location.search).toContain("utm_source=profile");

    act(() => {
      result.current.setQuery(
        { technology: "Redis", page: 1 },
        { history: "push" }
      );
    });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(window.location.search).toContain("technology=Redis");

    act(() => {
      window.history.replaceState(
        { source: "test" },
        "",
        "/projects?pillar=frontend&page=2"
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(result.current.query.pillar).toBe("frontend"));
    expect(result.current.query.page).toBe(2);
    expect(result.current.query.technology).toBe("all");
  });

  it("keeps opaque Page preview filters in memory without calling History", async () => {
    const previewMarker = document.createElement("div");
    previewMarker.dataset.pagePreviewRuntime = "";
    document.documentElement.append(previewMarker);
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() =>
      useUrlListQueryState(
        "projects",
        parseProjectDiscoveryQuery({ pillar: "backend" })
      )
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => {
      result.current.setQuery(
        { technology: "Redis", page: 1 },
        { history: "push" }
      );
    });
    expect(result.current.query.technology).toBe("Redis");
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(window.location.search).not.toContain("technology=Redis");
  });
});
