import { composePage, type PageTemplateProps } from "./page-template";

/** A4 Detail: project, article and video detail. Reading column plus sticky aside, then the CtaBand. */
export function DetailLayout(props: PageTemplateProps) {
  return composePage("A4", { cta: true, level: "detail" }, props);
}
