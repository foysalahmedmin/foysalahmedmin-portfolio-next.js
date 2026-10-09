import { composePage, type PageTemplateProps } from "./page-template";

/** A6 Conversation: the contact flow. The form is the page, so there is no CtaBand. */
export function ConversationLayout(props: PageTemplateProps) {
  return composePage("A6", { cta: false, level: "index" }, props);
}
