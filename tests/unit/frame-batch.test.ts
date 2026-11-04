// @vitest-environment jsdom

import { measureThenMutate } from "@/lib/dom/frame-batch";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

function stubFrames() {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queue.push(callback);
    return queue.length;
  });
  return {
    frames: () => queue.length,
    run: () => queue.splice(0).forEach((c) => c(0)),
  };
}

describe("measureThenMutate", () => {
  it("runs every read of a frame before any write, in one frame", () => {
    const { frames, run } = stubFrames();
    const log: string[] = [];
    measureThenMutate(
      () => {
        log.push("read A");
        return "a";
      },
      (value) => log.push(`write ${value}`)
    );
    measureThenMutate(
      () => {
        log.push("read B");
        return "b";
      },
      (value) => log.push(`write ${value}`)
    );
    expect(frames()).toBe(1);
    expect(log).toEqual([]);
    run();
    // A read after a write would force the browser to lay the page out again
    expect(log).toEqual(["read A", "read B", "write a", "write b"]);
  });

  it("starts a new frame for work queued after a flush, and passes each write its own value", () => {
    const { frames, run } = stubFrames();
    const seen: number[] = [];
    measureThenMutate(
      () => 1,
      (value) => seen.push(value)
    );
    run();
    measureThenMutate(
      () => 2,
      (value) => seen.push(value)
    );
    expect(frames()).toBe(1);
    run();
    expect(seen).toEqual([1, 2]);
  });
});
