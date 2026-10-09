import { composePage, type PageTemplateProps } from "./page-template";

/** A7 Document: privacy and terms. A reading column; no CtaBand. The document view renders its own header. */
export function DocumentLayout(props: PageTemplateProps) {
  return composePage("A7", { cta: false, level: "detail" }, props);
}
