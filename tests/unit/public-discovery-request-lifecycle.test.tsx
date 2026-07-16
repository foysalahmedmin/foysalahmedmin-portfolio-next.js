// @vitest-environment jsdom

import { useDebounce } from "@/hooks/utils/use-debounce";
import { useLatestRequest } from "@/hooks/utils/use-latest-request";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("public discovery request lifecycle", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("publishes only the latest debounced value", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 350),
      { initialProps: { value: "system" } }
    );

    rerender({ value: "system design" });
    act(() => vi.advanceTimersByTime(349));
    expect(result.current).toBe("system");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("system design");
  });

  it("aborts superseded and unmounted requests and identifies the current signal", () => {
    const { result, unmount } = renderHook(() => useLatestRequest());
    let first!: AbortSignal;
    let second!: AbortSignal;

    act(() => {
      first = result.current.start();
      second = result.current.start();
    });
    expect(first.aborted).toBe(true);
    expect(result.current.isCurrent(first)).toBe(false);
    expect(result.current.isCurrent(second)).toBe(true);

    unmount();
    expect(second.aborted).toBe(true);
  });
});
