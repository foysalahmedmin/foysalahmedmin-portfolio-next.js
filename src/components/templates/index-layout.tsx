import { composePage, type PageTemplateProps } from "./page-template";

/** A2 Index: case files, projects, articles and videos. Header, filter bar plus results, then the CtaBand. */
export function IndexLayout(props: PageTemplateProps) {
  return composePage("A2", { cta: true, level: "index" }, props);
}
