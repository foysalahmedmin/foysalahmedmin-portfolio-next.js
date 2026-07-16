import { PILLAR_KEYS } from "@/lib/content/pillars";
import {
  optionalText,
  stringList,
  toAdminBaseDto,
  toOptionalFileId,
  toPublicBaseDto,
  toPublicMediaDto,
} from "../repeatable-content/record.dto";
import {
  REPEATABLE_CONTENT_STATUSES,
  type TRepeatableDefinition,
} from "../repeatable-content/record.type";
import FAQ from "./faq.model";
import {
  FAQ_CATEGORIES,
  type TAdminFAQDto,
  type TFAQ,
  type TPublicFAQDto,
} from "./faq.type";
import { createFAQSchema, updateFAQSchema } from "./faq.validation";

export const faqDefinition = {
  domain: "faq",
  plural: "FAQs",
  model_name: "FAQ",
  collection_name: "faqs",
  cache_tag: "portfolio:v1:faqs",
  model: FAQ,
  create_schema: createFAQSchema,
  update_schema: updateFAQSchema,
  public_fields: ["answer", "category", "keywords"],
  search_fields: ["title", "summary", "answer", "keywords"],
  filter_rules: {
    category: { field: "category", kind: "enum", values: FAQ_CATEGORIES },
    pillar: { field: "primary_pillar", kind: "enum", values: PILLAR_KEYS },
    featured: { field: "is_featured", kind: "boolean" },
    status: {
      field: "status",
      kind: "enum",
      values: REPEATABLE_CONTENT_STATUSES,
      public: false,
    },
  },
  sort_fields: ["sequence", "title", "published_at", "updated_at"],
  file_fields: [
    {
      field: "visual_file",
      cardinality: "one",
      purposes: ["page"],
      public: true,
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    if (!optionalText(record.answer)) issues.push("answer");
    if (!FAQ_CATEGORIES.includes(record.category as never))
      issues.push("category");
    return issues;
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicFAQDto => ({
    ...toPublicBaseDto(record),
    question: String(record.title),
    answer: String(record.answer),
    category: record.category as TPublicFAQDto["category"],
    keywords: stringList(record.keywords),
    ...(toPublicMediaDto(record.visual_file)
      ? { visual: toPublicMediaDto(record.visual_file) }
      : {}),
  }),
  to_admin_dto: (record: Readonly<Record<string, unknown>>): TAdminFAQDto => ({
    ...toAdminBaseDto(record),
    answer: String(record.answer),
    category: record.category as TAdminFAQDto["category"],
    keywords: stringList(record.keywords),
    ...(toOptionalFileId(record.visual_file)
      ? { visual_file: toOptionalFileId(record.visual_file) }
      : {}),
  }),
} as const satisfies TRepeatableDefinition<TFAQ, TPublicFAQDto, TAdminFAQDto>;
