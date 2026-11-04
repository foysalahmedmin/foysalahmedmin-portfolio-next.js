"use client";

import { PinScene } from "@/components/motion/pin-scene";
import {
  HeroStoryProvider,
  type HeroStory,
} from "@/components/three/story-context";
import { useCallback, useRef, type ReactNode } from "react";

/**
 * The client shell of the hero: a pinned scene whose scrubbed progress is shared with the 3D canvas
 * through a ref, so the camera follows the story without a single React render per scroll step. The
 * hero's content is server-rendered and passed in as children.
 */
export function HeroScene({
  length = 300,
  children,
}: {
  length?: number;
  children: ReactNode;
}) {
  const story = useRef<HeroStory>({ progress: 0 });
  const onProgress = useCallback((progress: number) => {
    story.current.progress = progress;
  }, []);

  return (
    <HeroStoryProvider value={story}>
      <PinScene
        id="ingress"
        data-hero=""
        beats={3}
        length={length}
        onProgress={onProgress}
      >
        {children}
      </PinScene>
    </HeroStoryProvider>
  );
}
