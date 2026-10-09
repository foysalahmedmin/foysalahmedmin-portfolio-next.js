"use client";

import { useLayoutEffect } from "react";

type SurfaceMarkerProps = {
  surface: "public" | "console";
  /** Space-separated font variable classes that must also exist on <html> so portals inherit them. */
  fontClassNames?: string;
};

/**
 * Mirrors the active surface onto <html>.
 *
 * The inline script in the root layout sets `data-surface` before first paint for hard loads. This
 * component keeps it correct across client navigations between the public site and the admin, and
 * carries the next/font variable classes to <html> so portal content (modals, palette) inherits
 * the same faces and tokens as the page. Rendering is a no-op; it only touches the document element.
 */
export function SurfaceMarker({ surface, fontClassNames }: SurfaceMarkerProps) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const classes = (fontClassNames ?? "").split(/\s+/).filter(Boolean);
    const previous = root.getAttribute("data-surface");
    root.setAttribute("data-surface", surface);
    root.classList.add(...classes);
    return () => {
      root.classList.remove(...classes);
      if (previous && previous !== surface) {
        root.setAttribute("data-surface", previous);
      } else {
        root.removeAttribute("data-surface");
      }
    };
  }, [surface, fontClassNames]);

  return null;
}
