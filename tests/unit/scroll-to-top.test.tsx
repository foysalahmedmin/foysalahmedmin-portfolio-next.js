// @vitest-environment jsdom

import ScrollToTop from "@/components/ui/scroll-to-top";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScrollToTop", () => {
  it("appears past 400 px, one frame at a time, and reads only the scroll offset", () => {
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      queue.push(callback);
      return queue.length;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const size = vi.spyOn(document.documentElement, "scrollHeight", "get");

    const { container } = render(<ScrollToTop />);
    const wrapper = container.firstElementChild!;
    expect(wrapper).toHaveClass("opacity-0");
    // Nothing is read at mount: a restored position arrives as a scroll event
    expect(queue).toHaveLength(0);

    const scrollTo = (y: number) => {
      Object.defineProperty(window, "scrollY", {
        value: y,
        configurable: true,
      });
      fireEvent.scroll(window);
      fireEvent.scroll(window);
      expect(queue).toHaveLength(1);
      act(() => queue.splice(0).forEach((callback) => callback(0)));
    };

    scrollTo(900);
    expect(wrapper).toHaveClass("opacity-100");
    scrollTo(100);
    expect(wrapper).toHaveClass("opacity-0");
    expect(size).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Scroll to top" })
    ).toBeInTheDocument();
  });

  it("scrolls to the top smoothly", () => {
    const scroll = vi.fn();
    vi.stubGlobal("scrollTo", scroll);
    render(<ScrollToTop />);
    fireEvent.click(screen.getByRole("button", { name: "Scroll to top" }));
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
