import { composePage, type PageTemplateProps } from "./page-template";

/** A3 Story: a case-study detail page. Sticky diagram plus four chapters (Phase 6); the shared CtaBand closes it. */
export function StoryLayout(props: PageTemplateProps) {
  return composePage("A3", { cta: true, level: "detail" }, props);
}
