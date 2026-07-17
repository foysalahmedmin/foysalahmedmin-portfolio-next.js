// @vitest-environment jsdom

import AnimationApplier from "@/components/appliers/animation-applier";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/providers/motion-provider", () => ({
  useMotion: () => ({
    capability: "full",
    effectiveMotion: "reduced",
    hydrated: true,
    documentVisible: true,
  }),
}));

describe("preview-scoped reveal motion", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("observes normal-preview reveals even when the outer preference is reduced", async () => {
    const observe = vi.fn();
    class PreviewIntersectionObserver {
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];

      constructor(
        _callback: IntersectionObserverCallback,
        _options?: IntersectionObserverInit
      ) {}
    }
    vi.stubGlobal("IntersectionObserver", PreviewIntersectionObserver);

    const { container } = render(
      <>
        <section data-preview-motion="normal">
          <div data-testid="normal-reveal" data-reveal="up" />
        </section>
        <section data-preview-motion="reduced">
          <div data-testid="reduced-reveal" data-reveal="up" />
        </section>
        <AnimationApplier />
      </>
    );
    const normal = container.querySelector(
      '[data-testid="normal-reveal"]'
    ) as HTMLElement;
    const reduced = container.querySelector(
      '[data-testid="reduced-reveal"]'
    ) as HTMLElement;

    await waitFor(() => expect(observe).toHaveBeenCalledWith(normal));
    expect(observe).not.toHaveBeenCalledWith(reduced);
    expect(reduced.dataset.revealVisible).toBe("true");
  });
});
