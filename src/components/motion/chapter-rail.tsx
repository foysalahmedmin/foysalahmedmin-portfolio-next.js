"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TraceRail, type TraceRailItem } from "./trace-rail";

/** Short labels for the sections the home page has today; chapters name themselves with `data-chapter-label` from Phase 5 on. */
const KNOWN_LABELS: Readonly<Record<string, string>> = {
  ingress: "Ingress",
  about: "About",
  "pillar-showcase": "Practice",
  services: "Services",
  "architecture-workflow": "Automation",
  "working-process": "Process",
  skills: "Capabilities",
  "proof-metrics": "Proof",
  projects: "Projects",
  "case-studies": "Case files",
  articles: "Notes",
  videos: "Videos",
  reels: "Reels",
  github: "GitHub",
};

const MAX_CHAPTERS = 10;

const titleCase = (id: string) =>
  id
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * The signal rail for the home page (docs plan 4.0): one tick per chapter, found in the page itself.
 * A chapter is a `[data-chapter]` element or a section with an id that is a direct child of `<main>`,
 * so the rail follows whatever the page composition renders and never lists something that is not there.
 * Hidden on inner pages, which do not use this component.
 */
export function ChapterRail() {
  const pathname = usePathname();
  const [items, setItems] = useState<TraceRailItem[]>([]);

  useEffect(() => {
    const found: TraceRailItem[] = [];
    const seen = new Set<string>();
    document
      .querySelectorAll<HTMLElement>("main [data-chapter], main > section[id]")
      .forEach((element) => {
        const id = element.id || element.dataset.chapter;
        if (!id || seen.has(id)) return;
        seen.add(id);
        found.push({
          id,
          label:
            element.dataset.chapterLabel ?? KNOWN_LABELS[id] ?? titleCase(id),
        });
      });
    setItems(found.slice(0, MAX_CHAPTERS));
  }, [pathname]);

  if (items.length < 2) return null;
  return <TraceRail items={items} label="Page chapters" />;
}
