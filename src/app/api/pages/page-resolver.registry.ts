import { getPublicArticlesForComposition } from "@/app/api/articles/article.service";
import { CredentialService } from "@/app/api/credentials/credential.service";
import { FAQService } from "@/app/api/faqs/faq.service";
import { LegalDocumentService } from "@/app/api/legal-documents/legal-document.service";
import { getPublicProjectsForComposition } from "@/app/api/projects/project.service";
import { ServiceService } from "@/app/api/services/service.service";
import { getPublicSkillGroupsForComposition } from "@/app/api/skill-groups/skill-group.service";
import { TestimonialService } from "@/app/api/testimonials/testimonial.service";
import { TimelineEntryService } from "@/app/api/timeline/timeline-entry.service";
import type { TPageSectionKind } from "./page.type";

export type TPageCompositionReadInput = Readonly<{
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}>;

export type TPageCompositionItem = Readonly<Record<string, unknown>>;

const asItems = (value: readonly unknown[]): TPageCompositionItem[] =>
  value.filter(
    (item): item is Readonly<Record<string, unknown>> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );

export const readPageCompositionItems = async (
  kind: TPageSectionKind,
  input: TPageCompositionReadInput
): Promise<TPageCompositionItem[]> => {
  switch (kind) {
    case "project-collection":
      return asItems(await getPublicProjectsForComposition(input));
    case "article-collection":
      return asItems(await getPublicArticlesForComposition(input));
    case "service-collection":
      return asItems(await ServiceService.getPublicForComposition(input));
    case "skill-group-collection":
      return asItems(await getPublicSkillGroupsForComposition(input));
    case "timeline":
      return asItems(await TimelineEntryService.getPublicForComposition(input));
    case "credential-collection":
      return asItems(await CredentialService.getPublicForComposition(input));
    case "faq-list":
      return asItems(await FAQService.getPublicForComposition(input));
    case "testimonial-collection":
      return asItems(await TestimonialService.getPublicForComposition(input));
    case "legal-document":
      return asItems(await LegalDocumentService.getPublicForComposition(input));
    default:
      return [];
  }
};
