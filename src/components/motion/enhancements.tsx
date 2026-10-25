"use client";

import type { PaletteCommand } from "@/lib/palette/commands";
import { getScenePreference } from "@/state/scene-store";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Cursor } from "./cursor";
import { MotionEngineHost } from "./motion-engine-host";
import { RouteTransitions } from "./route-transitions";
import { ScrollRestoration } from "./scroll-restoration";

const CommandPalette = dynamic(() => import("./command-palette"), {
  ssr: false,
});
const PerfOverlay = dynamic(() => import("./perf-overlay"), { ssr: false });

type EnhancementsProps = {
  commands: readonly PaletteCommand[];
  /** How many times the shell has asked for the palette (shortcut or button). */
  paletteRequests: number;
};

/**
 * Everything the public site adds after hydration: the motion engine, the route shutter, the cursor,
 * the command palette and the perf overlay. Loaded by `PublicEnhancements` once the page is idle, so
 * none of it is in the initial JavaScript or competes with the first paint. The palette's own chunk
 * is fetched in the background so the first open is instant.
 */
export default function Enhancements({
  commands,
  paletteRequests,
}: EnhancementsProps) {
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(
      new URLSearchParams(window.location.search).get("debug") === "perf"
    );
    document.documentElement.dataset.scene = getScenePreference();

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void import("./command-palette"))
      : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, []);

  return (
    <>
      <MotionEngineHost />
      <RouteTransitions />
      <ScrollRestoration />
      <Cursor />
      {paletteRequests > 0 ? (
        <CommandPalette commands={commands} requests={paletteRequests} />
      ) : null}
      {debug ? <PerfOverlay /> : null}
    </>
  );
}
