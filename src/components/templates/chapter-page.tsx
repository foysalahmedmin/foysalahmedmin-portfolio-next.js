import { ChapterRail } from "@/components/motion/chapter-rail";
import { composePage, type PageTemplateProps } from "./page-template";

/**
 * A1 Chapter: the home page. The signal rail follows its chapters; the chapters own their bands, pins
 * and 3D (Phases 3 and 5); the CtaBand comes from the page composition.
 */
export function ChapterPage({ children, ...props }: PageTemplateProps) {
  return composePage(
    "A1",
    { cta: false, level: "index" },
    {
      ...props,
      children: (
        <>
          <ChapterRail />
          {children}
        </>
      ),
    }
  );
}
