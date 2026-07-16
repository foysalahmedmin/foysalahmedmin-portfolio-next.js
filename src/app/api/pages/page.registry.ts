import Article from "@/app/api/articles/article.model";
import { credentialDefinition } from "@/app/api/credentials/credential.definition";
import { faqDefinition } from "@/app/api/faqs/faq.definition";
import { legalDocumentDefinition } from "@/app/api/legal-documents/legal-document.definition";
import Project from "@/app/api/projects/project.model";
import { serviceDefinition } from "@/app/api/services/service.definition";
import { skillGroupDefinition } from "@/app/api/skill-groups/skill-group.definition";
import { testimonialDefinition } from "@/app/api/testimonials/testimonial.definition";
import { timelineEntryDefinition } from "@/app/api/timeline/timeline-entry.definition";
import type { TFilePurpose } from "@/app/api/files/file.type";
import type { TPageReferenceDomain, TPageSectionKind } from "./page.type";

type TRegistryDefinition = Readonly<{
  domain: string;
  model: unknown;
  public_filter?: Readonly<Record<string, unknown>>;
  file_fields: readonly Readonly<{
    field: string;
    cardinality: "one" | "many";
    purposes: readonly TFilePurpose[];
    public: boolean;
  }>[];
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => string[];
  get_async_publish_issues?: (
    record: Readonly<Record<string, unknown>>
  ) => Promise<string[]>;
}>;

export type TPageSectionRegistration = Readonly<{
  domain: TPageReferenceDomain;
  definition: TRegistryDefinition;
}>;

const COLLECTION_REGISTRY = Object.freeze({
  "project-collection": {
    domain: "project",
    definition: {
      domain: "project",
      model: Project,
      file_fields: [
        {
          field: "thumbnail",
          cardinality: "one",
          purposes: ["project"],
          public: true,
        },
        {
          field: "images",
          cardinality: "many",
          purposes: ["project"],
          public: true,
        },
      ],
      get_publish_issues: (record: Readonly<Record<string, unknown>>) =>
        record.slug && record.category && record.author
          ? []
          : ["content_graph"],
    } as unknown as TRegistryDefinition,
  },
  "article-collection": {
    domain: "article",
    definition: {
      domain: "article",
      model: Article,
      file_fields: [
        {
          field: "thumbnail",
          cardinality: "one",
          purposes: ["article"],
          public: true,
        },
        {
          field: "images",
          cardinality: "many",
          purposes: ["article"],
          public: true,
        },
      ],
      get_publish_issues: (record: Readonly<Record<string, unknown>>) =>
        record.slug && record.category && record.author
          ? []
          : ["content_graph"],
    } as unknown as TRegistryDefinition,
  },
  "service-collection": {
    domain: "service",
    definition: serviceDefinition,
  },
  "skill-group-collection": {
    domain: "skill-group",
    definition: skillGroupDefinition,
  },
  timeline: {
    domain: "timeline-entry",
    definition: timelineEntryDefinition,
  },
  "credential-collection": {
    domain: "credential",
    definition: credentialDefinition,
  },
  "faq-list": { domain: "faq", definition: faqDefinition },
  "testimonial-collection": {
    domain: "testimonial",
    definition: testimonialDefinition,
  },
  "legal-document": {
    domain: "legal-document",
    definition: legalDocumentDefinition,
  },
} satisfies Partial<Record<TPageSectionKind, TPageSectionRegistration>>);

export const getPageSectionRegistration = (
  kind: TPageSectionKind
): TPageSectionRegistration | null =>
  (
    COLLECTION_REGISTRY as Partial<
      Record<TPageSectionKind, TPageSectionRegistration>
    >
  )[kind] ?? null;

export const PAGE_COLLECTION_SECTION_KINDS = Object.freeze(
  Object.keys(COLLECTION_REGISTRY) as TPageSectionKind[]
);
