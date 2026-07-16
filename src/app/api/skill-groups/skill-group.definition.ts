import { PILLAR_KEYS } from "@/lib/content/pillars";
import {
  optionalText,
  toAdminBaseDto,
  toOptionalFileId,
  toPublicBaseDto,
  toPublicMediaDto,
} from "../repeatable-content/record.dto";
import {
  REPEATABLE_CONTENT_STATUSES,
  type TRepeatableDefinition,
} from "../repeatable-content/record.type";
import SkillGroup from "./skill-group.model";
import type {
  TAdminSkillGroupDto,
  TPublicSkillGroupDto,
  TSkillGroup,
} from "./skill-group.type";
import {
  createSkillGroupSchema,
  updateSkillGroupSchema,
} from "./skill-group.validation";

export const skillGroupDefinition = {
  domain: "skill-group",
  plural: "Skill groups",
  model_name: "SkillGroup",
  collection_name: "skill_groups",
  cache_tag: "portfolio:v1:skill-groups",
  model: SkillGroup,
  create_schema: createSkillGroupSchema,
  update_schema: updateSkillGroupSchema,
  public_fields: ["description", "icon_key"],
  search_fields: ["title", "summary", "description"],
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
      purposes: ["skill"],
      public: true,
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    if (!optionalText(record.summary)) issues.push("summary");
    if (!optionalText(record.description)) issues.push("description");
    if (!optionalText(record.primary_pillar)) issues.push("primary_pillar");
    return issues;
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicSkillGroupDto => ({
    ...toPublicBaseDto(record),
    description: String(record.description),
    ...(optionalText(record.icon_key)
      ? { icon_key: record.icon_key as TPublicSkillGroupDto["icon_key"] }
      : {}),
    ...(toPublicMediaDto(record.visual_file)
      ? { visual: toPublicMediaDto(record.visual_file) }
      : {}),
  }),
  to_admin_dto: (
    record: Readonly<Record<string, unknown>>
  ): TAdminSkillGroupDto => ({
    ...toAdminBaseDto(record),
    description: String(record.description),
    ...(optionalText(record.icon_key)
      ? { icon_key: record.icon_key as TAdminSkillGroupDto["icon_key"] }
      : {}),
    ...(toOptionalFileId(record.visual_file)
      ? { visual_file: toOptionalFileId(record.visual_file) }
      : {}),
  }),
} as const satisfies TRepeatableDefinition<
  TSkillGroup,
  TPublicSkillGroupDto,
  TAdminSkillGroupDto
>;
