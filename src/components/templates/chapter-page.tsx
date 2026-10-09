import { composePage, type PageTemplateProps } from "./page-template";

/** A1 Chapter: the home page. Chapters own their bands, trace rail, pins and 3D (Phases 3 and 5); the CtaBand comes from the page composition. */
export function ChapterPage(props: PageTemplateProps) {
  return composePage("A1", { cta: false, level: "index" }, props);
}
