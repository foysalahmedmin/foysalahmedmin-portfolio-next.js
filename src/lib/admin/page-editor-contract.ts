import type {
  TPageDraftSnapshot,
  TPageRouteKey,
  TPageSection,
  TPageSectionKind,
} from "@/app/api/pages/page.type";
import { CREDENTIAL_TYPES } from "@/app/api/credentials/credential.type";
import { FAQ_CATEGORIES } from "@/app/api/faqs/faq.type";
import { LEGAL_DOCUMENT_TYPES } from "@/app/api/legal-documents/legal-document.type";
import { TESTIMONIAL_RELATIONSHIPS } from "@/app/api/testimonials/testimonial.type";
import { TIMELINE_ENTRY_TYPES } from "@/app/api/timeline/timeline-entry.type";
import { PROJECT_TYPES } from "@/lib/content/portfolio-contract";
import { PILLAR_KEYS } from "@/lib/content/pillars";

export type TPageSectionEditorDefinition = Readonly<{
  label: string;
  layouts: readonly string[];
  source: "system" | "collection";
  filterFields: readonly Readonly<{
    key: string;
    label: string;
    type: "boolean" | "select";
    options?: readonly string[];
  }>[];
}>;

const shared = [
  { key: "featured", label: "Featured only", type: "boolean" as const },
  {
    key: "pillar",
    label: "Pillar",
    type: "select" as const,
    options: PILLAR_KEYS,
  },
] as const;

export const PAGE_SECTION_EDITOR_DEFINITIONS: Readonly<
  Record<TPageSectionKind, TPageSectionEditorDefinition>
> = {
  "site-hero": {
    label: "Site hero",
    layouts: ["default", "split", "immersive"],
    source: "system",
    filterFields: [],
  },
  "site-introduction": {
    label: "Site introduction",
    layouts: ["default", "split"],
    source: "system",
    filterFields: [],
  },
  "pillar-showcase": {
    label: "Five-pillar capability showcase",
    layouts: ["default", "compact", "sticky"],
    source: "system",
    filterFields: [],
  },
  "process-steps": {
    label: "Working process steps",
    layouts: ["default", "numbered", "compact"],
    source: "system",
    filterFields: [],
  },
  "metrics-strip": {
    label: "Proof metrics strip",
    layouts: ["default", "compact"],
    source: "system",
    filterFields: [],
  },
  "project-collection": {
    label: "Projects",
    layouts: ["grid", "featured", "list"],
    source: "collection",
    filterFields: [
      ...shared,
      {
        key: "project_type",
        label: "Project type",
        type: "select",
        options: PROJECT_TYPES,
      },
    ],
  },
  "article-collection": {
    label: "Articles",
    layouts: ["grid", "featured", "list"],
    source: "collection",
    filterFields: shared,
  },
  "service-collection": {
    label: "Services",
    layouts: ["grid", "cards", "list"],
    source: "collection",
    filterFields: shared,
  },
  "skill-group-collection": {
    label: "Skill groups",
    layouts: ["grid", "matrix", "list"],
    source: "collection",
    filterFields: shared,
  },
  timeline: {
    label: "Timeline",
    layouts: ["timeline", "compact", "list"],
    source: "collection",
    filterFields: [
      ...shared,
      {
        key: "type",
        label: "Entry type",
        type: "select",
        options: TIMELINE_ENTRY_TYPES,
      },
    ],
  },
  "credential-collection": {
    label: "Credentials",
    layouts: ["grid", "compact", "list"],
    source: "collection",
    filterFields: [
      ...shared,
      {
        key: "type",
        label: "Credential type",
        type: "select",
        options: CREDENTIAL_TYPES,
      },
    ],
  },
  "faq-list": {
    label: "FAQs",
    layouts: ["accordion", "list"],
    source: "collection",
    filterFields: [
      ...shared,
      {
        key: "category",
        label: "FAQ category",
        type: "select",
        options: FAQ_CATEGORIES,
      },
    ],
  },
  "testimonial-collection": {
    label: "Testimonials",
    layouts: ["carousel", "grid", "list"],
    source: "collection",
    filterFields: [
      { key: "featured", label: "Featured only", type: "boolean" },
      {
        key: "relationship",
        label: "Relationship",
        type: "select",
        options: TESTIMONIAL_RELATIONSHIPS,
      },
    ],
  },
  "legal-document": {
    label: "Legal document",
    layouts: ["document"],
    source: "collection",
    filterFields: [
      {
        key: "type",
        label: "Document type",
        type: "select",
        options: LEGAL_DOCUMENT_TYPES,
      },
    ],
  },
  "contact-form": {
    label: "Contact form",
    layouts: ["default", "split"],
    source: "system",
    filterFields: [],
  },
  "contact-cta": {
    label: "Contact call to action",
    layouts: ["default", "banner", "compact"],
    source: "system",
    filterFields: [],
  },
};

export const PAGE_EDITOR_ROUTE_KINDS: Readonly<
  Record<TPageRouteKey, readonly TPageSectionKind[]>
> = {
  home: [
    "site-hero",
    "metrics-strip",
    "pillar-showcase",
    "service-collection",
    "skill-group-collection",
    "project-collection",
    "article-collection",
    "process-steps",
    "testimonial-collection",
    "faq-list",
    "contact-cta",
  ],
  about: [
    "site-introduction",
    "skill-group-collection",
    "timeline",
    "credential-collection",
    "testimonial-collection",
    "faq-list",
    "contact-cta",
  ],
  projects: ["project-collection", "contact-cta"],
  articles: ["article-collection", "contact-cta"],
  contact: ["contact-form", "faq-list"],
  privacy: ["legal-document"],
  terms: ["legal-document"],
};

const initialKind: Readonly<Record<TPageRouteKey, TPageSectionKind>> = {
  home: "site-hero",
  about: "site-introduction",
  projects: "project-collection",
  articles: "article-collection",
  contact: "contact-form",
  privacy: "legal-document",
  terms: "legal-document",
};

export const createPageEditorSection = (
  routeKey: TPageRouteKey,
  kind: TPageSectionKind,
  current: readonly TPageSection[] = []
): TPageSection => {
  const definition = PAGE_SECTION_EDITOR_DEFINITIONS[kind];
  const baseKey = kind;
  let key: string = baseKey;
  let suffix = 2;
  while (current.some((section) => section.key === key)) {
    key = `${baseKey}-${suffix}`;
    suffix += 1;
  }
  const common = {
    key,
    kind,
    visible: true,
    layout: definition.layouts[0]!,
  };
  if (definition.source === "system") {
    return { ...common, source: { mode: "system" } } as TPageSection;
  }
  const filter = kind === "legal-document" ? { type: routeKey } : {};
  return {
    ...common,
    item_limit: kind === "legal-document" ? 1 : 6,
    source: { mode: "automatic", filter },
  } as TPageSection;
};

export const createNeutralPageDraft = (
  routeKey: TPageRouteKey
): TPageDraftSnapshot => ({
  seo: { noindex: routeKey === "privacy" || routeKey === "terms" },
  sections: [createPageEditorSection(routeKey, initialKind[routeKey])],
});
