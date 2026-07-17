"use client";

import { MotionModeOverride } from "@/providers/motion-provider";
import ParallaxProvider from "@/providers/parallax-provider";
import type {
  TPagePreviewMotion,
  TPagePreviewTheme,
} from "@/lib/pages/page-preview-display";
import { useEffect, type ReactNode } from "react";

export default function PagePreviewRuntime({
  theme,
  motion,
  children,
}: Readonly<{
  theme: TPagePreviewTheme;
  motion: TPagePreviewMotion;
  children: ReactNode;
}>) {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const otherTheme = theme === "dark" ? "light" : "dark";
      if (root.classList.contains(otherTheme)) {
        root.classList.remove(otherTheme);
      }
      if (!root.classList.contains(theme)) root.classList.add(theme);
      if (root.dataset.previewTheme !== theme) {
        root.dataset.previewTheme = theme;
      }
      if (root.dataset.previewMotion !== motion) {
        root.dataset.previewMotion = motion;
      }
      const effectiveMotion = motion === "normal" ? "full" : "reduced";
      if (root.dataset.motion !== effectiveMotion) {
        root.dataset.motion = effectiveMotion;
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-motion"],
    });
    return () => {
      observer.disconnect();
      delete root.dataset.previewTheme;
      delete root.dataset.previewMotion;
    };
  }, [motion, theme]);

  return (
    <MotionModeOverride mode={motion === "normal" ? "full" : "reduced"}>
      <ParallaxProvider>
        <div
          className={`${theme} bg-background text-foreground min-h-screen`}
          data-page-preview-runtime=""
          data-preview-motion={motion}
        >
          {children}
        </div>
      </ParallaxProvider>
    </MotionModeOverride>
  );
}
