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
import Service from "./service.model";
import type {
  TAdminServiceDto,
  TPublicServiceDto,
  TService,
} from "./service.type";
import { createServiceSchema, updateServiceSchema } from "./service.validation";

export const serviceDefinition = {
  domain: "service",
  plural: "Services",
  model_name: "Service",
  collection_name: "services",
  cache_tag: "portfolio:v1:services",
  model: Service,
  create_schema: createServiceSchema,
  update_schema: updateServiceSchema,
  public_fields: [
    "outcome",
    "capabilities",
    "deliverables",
    "technologies",
    "icon_key",
  ],
  search_fields: ["title", "summary", "outcome", "capabilities"],
  filter_rules: {
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
      purposes: ["service"],
      public: true,
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    if (!optionalText(record.summary)) issues.push("summary");
    if (!optionalText(record.outcome)) issues.push("outcome");
    if (!optionalText(record.primary_pillar)) issues.push("primary_pillar");
    if (!stringList(record.capabilities).length) issues.push("capabilities");
    return issues;
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicServiceDto => ({
    ...toPublicBaseDto(record),
    outcome: String(record.outcome),
    capabilities: stringList(record.capabilities),
    deliverables: stringList(record.deliverables),
    technologies: stringList(record.technologies),
    ...(optionalText(record.icon_key)
      ? { icon_key: record.icon_key as TPublicServiceDto["icon_key"] }
      : {}),
    ...(toPublicMediaDto(record.visual_file)
      ? { visual: toPublicMediaDto(record.visual_file) }
      : {}),
  }),
  to_admin_dto: (
    record: Readonly<Record<string, unknown>>
  ): TAdminServiceDto => ({
    ...toAdminBaseDto(record),
    outcome: String(record.outcome),
    capabilities: stringList(record.capabilities),
    deliverables: stringList(record.deliverables),
    technologies: stringList(record.technologies),
    ...(optionalText(record.icon_key)
      ? { icon_key: record.icon_key as TAdminServiceDto["icon_key"] }
      : {}),
    ...(toOptionalFileId(record.visual_file)
      ? { visual_file: toOptionalFileId(record.visual_file) }
      : {}),
  }),
} as const satisfies TRepeatableDefinition<
  TService,
  TPublicServiceDto,
  TAdminServiceDto
>;
