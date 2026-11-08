"use client";

import { useEffect } from "react";

/**
 * Scroll-spy for the section index: marks the link of the section nearest the top of the viewport with
 * aria-current="location". Renders nothing; without JavaScript the anchors still work, only the highlight is absent.
 */
export function SectionSpy({ ids }: { ids: readonly string[] }) {
  const key = ids.join("|");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const current = sections.find((section) => visible.has(section.id));
        if (!current) return;
        for (const link of document.querySelectorAll<HTMLAnchorElement>(
          "[data-cp='section-index'] a[href^='#']"
        )) {
          if (link.getAttribute("href") === `#${current.id}`) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        }
      },
      // A band in the upper part of the viewport: the section crossing it is the one being read
      { rootMargin: "-15% 0px -65% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [key]);
  return null;
}
