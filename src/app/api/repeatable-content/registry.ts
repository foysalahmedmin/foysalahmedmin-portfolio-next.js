import { credentialDefinition } from "../credentials/credential.definition";
import { faqDefinition } from "../faqs/faq.definition";
import { legalDocumentDefinition } from "../legal-documents/legal-document.definition";
import { serviceDefinition } from "../services/service.definition";
import { skillGroupDefinition } from "../skill-groups/skill-group.definition";
import { skillDefinition } from "../skills/skill.definition";
import { testimonialDefinition } from "../testimonials/testimonial.definition";
import { timelineEntryDefinition } from "../timeline/timeline-entry.definition";
import type { TRepeatableContentDomain } from "./record.type";

export const REPEATABLE_CONTENT_REGISTRY = Object.freeze({
  service: serviceDefinition,
  "skill-group": skillGroupDefinition,
  skill: skillDefinition,
  "timeline-entry": timelineEntryDefinition,
  credential: credentialDefinition,
  faq: faqDefinition,
  testimonial: testimonialDefinition,
  "legal-document": legalDocumentDefinition,
} satisfies Record<TRepeatableContentDomain, object>);

export const getRepeatableContentDefinition = (
  domain: TRepeatableContentDomain
) => REPEATABLE_CONTENT_REGISTRY[domain];
