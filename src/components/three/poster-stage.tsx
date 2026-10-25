"use client";

import { useEffect, useRef } from "react";
import { QUALITY } from "./quality";
import { createTopologyScene } from "./topology-scene";

declare global {
  interface Window {
    /** Read by scripts/render-hero-poster.ts. */
    __heroPoster?: { png: () => string; calls: number; triangles: number };
  }
}

/**
 * Renders the hero scene once, deterministically, for the poster script. The viewport size is the
 * poster size; `?theme=light|dark` picks the material set and `?quality=simplified` the tier 2 scene.
 * Served only where the Motion lab is (development, or MOTION_LAB=1).
 */
export function PosterStage() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const params = new URLSearchParams(window.location.search);
    const light = params.get("theme") === "light";
    const quality =
      params.get("quality") === "simplified"
        ? QUALITY.simplified
        : QUALITY.full;

    const scene = createTopologyScene({
      host: element,
      quality,
      labelElements: [],
      light,
      preserveDrawingBuffer: true,
    });
    scene.resize(element.clientWidth, element.clientHeight);
    scene.renderStill();
    const info = scene.info();
    window.__heroPoster = {
      png: () => scene.canvas.toDataURL("image/png"),
      calls: info.calls,
      triangles: info.triangles,
    };
    element.dataset.ready = "true";
    return () => {
      delete window.__heroPoster;
      scene.dispose();
    };
  }, []);

  return (
    <div
      ref={host}
      data-poster-stage=""
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "transparent",
      }}
    />
  );
}
