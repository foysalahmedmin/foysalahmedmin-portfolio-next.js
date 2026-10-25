"use client";

import { useEffect, useRef } from "react";
import { useEngineState } from "./engine-provider";

/**
 * The `?debug=perf` overlay (docs plan 3.7.1): frame rate, p95 frame interval, long animation frames,
 * layout shift, running animations, ScrollTriggers and promoted layers, once per second. It writes to
 * the DOM directly so reading the numbers does not change them. For reviewing feel on a real device.
 */
export default function PerfOverlay() {
  const output = useRef<HTMLPreElement>(null);
  const { engine, status, tier } = useEngineState();
  const engineRef = useRef(engine);
  const stateRef = useRef({ status, tier });

  useEffect(() => {
    engineRef.current = engine;
    stateRef.current = { status, tier };
  }, [engine, status, tier]);

  useEffect(() => {
    const intervals: number[] = [];
    let last = 0;
    let frame = 0;
    let longFrames = 0;
    let shift = 0;

    const tick = (time: number) => {
      if (last) intervals.push(time - last);
      if (intervals.length > 120) intervals.shift();
      last = time;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    const observers: PerformanceObserver[] = [];
    const observe = (
      type: string,
      handle: (entry: PerformanceEntry) => void
    ) => {
      try {
        const observer = new PerformanceObserver((list) =>
          list.getEntries().forEach(handle)
        );
        observer.observe({ type, buffered: true });
        observers.push(observer);
      } catch {
        /* entry type not supported in this browser */
      }
    };
    observe("long-animation-frame", () => {
      longFrames += 1;
    });
    observe("layout-shift", (entry) => {
      const value = entry as PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      };
      if (!value.hadRecentInput) shift += value.value;
    });

    const report = window.setInterval(() => {
      if (!output.current || intervals.length === 0) return;
      const sorted = [...intervals].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      const mean =
        intervals.reduce((sum, item) => sum + item, 0) / intervals.length;
      const promoted = document.querySelectorAll(
        "[data-reveal-ready]:not([data-reveal-visible]), [data-pin-scene][data-pinned], [data-cursor], [data-magnetic]"
      ).length;
      output.current.textContent = [
        `fps ${(1000 / mean).toFixed(0)}  p95 ${p95.toFixed(1)} ms`,
        `long frames ${longFrames}  CLS ${shift.toFixed(3)}`,
        `animations ${document.getAnimations().length}  triggers ${engineRef.current?.ScrollTrigger.getAll().length ?? 0}  layers ~${promoted}`,
        `tier ${stateRef.current.tier}  engine ${stateRef.current.status}`,
      ].join("\n");
    }, 1000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(report);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <pre
      ref={output}
      aria-hidden="true"
      data-perf-overlay=""
      className="bg-background text-foreground border-line-4 pointer-events-none fixed bottom-3 left-3 z-[200] border px-3 py-2 font-mono text-[11px] leading-4"
    >
      measuring…
    </pre>
  );
}
