"use client";

import { useEffect, useId, useRef } from "react";

type PauseFn = () => void;

/**
 * Module-scoped, not component state: every video player on the page —
 * inline cards, the shared modal, hero embeds — shares this one registry, so
 * "pause whoever else is playing" works across component trees that share no
 * parent. A React Context would only coordinate players under the same
 * provider and would re-render every subscriber on each play/pause; nothing
 * here needs a render, since pausing another player is an imperative call to
 * that player's own pause function, not a state update this module owns.
 */
const registry = new Map<string, PauseFn>();
let activeId: string | null = null;

function claim(id: string): void {
  if (activeId && activeId !== id) {
    registry.get(activeId)?.();
  }
  activeId = id;
}

function release(id: string): void {
  if (activeId === id) activeId = null;
}

/**
 * Keeps at most one video playing anywhere in the app at a time.
 *
 * Call `claimPlayback()` the moment a player actually starts (its own
 * `onPlay`/`onPlaying` event, not the click that requested it — playback can
 * fail or buffer first). `onForcedPause` runs when a different player claims
 * playback instead; it should do whatever that player's own pause control
 * does, so the two paths can never disagree about the player's state.
 */
export function useExclusiveVideoPlayback(onForcedPause: PauseFn) {
  const id = useId();
  const pauseRef = useRef(onForcedPause);

  useEffect(() => {
    pauseRef.current = onForcedPause;
  });

  useEffect(() => {
    registry.set(id, () => pauseRef.current());
    return () => {
      registry.delete(id);
      release(id);
    };
  }, [id]);

  return {
    claimPlayback: () => claim(id),
    releasePlayback: () => release(id),
  };
}
