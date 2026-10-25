"use client";

import { createContext, useContext, type MutableRefObject } from "react";

/** Scrubbed scroll progress (0..1) of the hero story, written by the pin and read by the 3D camera every frame. */
export type HeroStory = { progress: number };

const HeroStoryContext = createContext<MutableRefObject<HeroStory> | null>(
  null
);

export const HeroStoryProvider = HeroStoryContext.Provider;

export function useHeroStory(): MutableRefObject<HeroStory> | null {
  return useContext(HeroStoryContext);
}
