"use client";

import type { PaletteCommand } from "@/lib/palette/commands";
import { PALETTE_EVENT, isPaletteShortcut } from "@/lib/palette/shortcut";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Enhancements = dynamic(() => import("./enhancements"), { ssr: false });

/**
 * The only enhancement code in the initial JavaScript: a stub that waits for the page to be idle,
 * then loads the rest. It also listens for the palette shortcut and the header button from the start,
 * so an early request is not lost: it loads the enhancements at once and opens the palette on arrival.
 */
export function PublicEnhancements({
  commands,
}: {
  commands: readonly PaletteCommand[];
}) {
  const [ready, setReady] = useState(false);
  const [paletteRequests, setPaletteRequests] = useState(0);

  useEffect(() => {
    const request = () => {
      setPaletteRequests((count) => count + 1);
      setReady(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      request();
    };

    window.addEventListener(PALETTE_EVENT, request);
    window.addEventListener("keydown", onKeyDown);

    const hasIdle = typeof window.requestIdleCallback === "function";
    const handle = hasIdle
      ? window.requestIdleCallback(() => setReady(true), { timeout: 2_000 })
      : window.setTimeout(() => setReady(true), 200);

    return () => {
      window.removeEventListener(PALETTE_EVENT, request);
      window.removeEventListener("keydown", onKeyDown);
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  return ready ? (
    <Enhancements commands={commands} paletteRequests={paletteRequests} />
  ) : null;
}
