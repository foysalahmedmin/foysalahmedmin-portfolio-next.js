import { composePage, type PageTemplateProps } from "./page-template";

/** A5 Narrative: the About page. */
export function NarrativePage(props: PageTemplateProps) {
  return composePage("A5", { cta: true, level: "index" }, props);
}
