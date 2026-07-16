import { PILLAR_KEYS } from "@/lib/content/pillars";
import type { ClientSession } from "mongoose";
import {
  optionalText,
  stringList,
  toAdminBaseDto,
  toId,
  toIso,
  toOptionalFileId,
  toPublicBaseDto,
  toPublicMediaDto,
} from "../repeatable-content/record.dto";
import {
  REPEATABLE_CONTENT_STATUSES,
  type TRepeatableDefinition,
} from "../repeatable-content/record.type";
import SkillGroup from "../skill-groups/skill-group.model";
import Skill from "./skill.model";
import type { TAdminSkillDto, TPublicSkillDto, TSkill } from "./skill.type";
import { SKILL_EVIDENCE_SOURCES, SKILL_PROFICIENCY_LEVELS } from "./skill.type";
import { createSkillSchema, updateSkillSchema } from "./skill.validation";

const getGroupDto = (value: unknown): { slug: string; title: string } => {
  const group =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return { slug: String(group.slug ?? ""), title: String(group.title ?? "") };
};

export const skillDefinition = {
  domain: "skill",
  plural: "Skills",
  model_name: "Skill",
  collection_name: "skills",
  cache_tag: "portfolio:v1:skills",
  model: Skill,
  create_schema: createSkillSchema,
  update_schema: updateSkillSchema,
  public_fields: [
    "group",
    "proficiency_level",
    "claim_verification",
    "years_experience",
    "keywords",
  ],
  public_filter: { claim_verification: { $in: ["derived", "verified"] } },
  is_public_record_eligible: (record: Readonly<Record<string, unknown>>) => {
    const group =
      record.group && typeof record.group === "object"
        ? (record.group as Record<string, unknown>)
        : null;
    return Boolean(
      group?.slug &&
        group.title &&
        group.primary_pillar === record.primary_pillar
    );
  },
  search_fields: ["title", "summary", "keywords"],
  filter_rules: {
    pillar: { field: "primary_pillar", kind: "enum", values: PILLAR_KEYS },
    group: { field: "group", kind: "object_id", public: false },
    proficiency: {
      field: "proficiency_level",
      kind: "enum",
      values: SKILL_PROFICIENCY_LEVELS,
    },
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
      field: "icon_file",
      cardinality: "one",
      purposes: ["skill"],
      public: true,
    },
  ],
  public_populates: [
    {
      path: "group",
      select: "slug title primary_pillar",
      match: {
        status: "published",
        enabled: true,
        is_deleted: { $ne: true },
      },
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    if (!record.group) issues.push("group");
    if (!optionalText(record.primary_pillar)) issues.push("primary_pillar");
    if (!SKILL_PROFICIENCY_LEVELS.includes(record.proficiency_level as never)) {
      issues.push("proficiency_level");
    }
    if (!SKILL_EVIDENCE_SOURCES.includes(record.evidence_source as never)) {
      issues.push("evidence_source");
    }
    if (!optionalText(record.evidence_reference))
      issues.push("evidence_reference");
    if (!["derived", "verified"].includes(String(record.claim_verification))) {
      issues.push("claim_verification");
    }
    if (
      record.claim_verification === "verified" &&
      (!record.evidence_verified_at || !record.evidence_verified_by)
    ) {
      issues.push("evidence_verification");
    }
    return issues;
  },
  get_async_publish_issues: async (
    record: Readonly<Record<string, unknown>>,
    session?: ClientSession
  ) => {
    const groupId = toId(record.group);
    if (!groupId) return ["group"];
    const query = SkillGroup.findOne({
      _id: groupId,
      status: "published",
      enabled: true,
    }).select("primary_pillar");
    if (session) query.session(session);
    const group = await query.lean();
    if (!group) return ["group"];
    return group.primary_pillar !== record.primary_pillar
      ? ["group.primary_pillar"]
      : [];
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicSkillDto => ({
    ...toPublicBaseDto(record),
    group: getGroupDto(record.group),
    proficiency_level:
      record.proficiency_level as TPublicSkillDto["proficiency_level"],
    proficiency_verification:
      record.claim_verification as TPublicSkillDto["proficiency_verification"],
    ...(typeof record.years_experience === "number"
      ? { years_experience: record.years_experience }
      : {}),
    keywords: stringList(record.keywords),
    ...(toPublicMediaDto(record.icon_file)
      ? { icon: toPublicMediaDto(record.icon_file) }
      : {}),
  }),
  to_admin_dto: (
    record: Readonly<Record<string, unknown>>
  ): TAdminSkillDto => ({
    ...toAdminBaseDto(record),
    group: toId(record.group),
    proficiency_level:
      record.proficiency_level as TAdminSkillDto["proficiency_level"],
    ...(optionalText(record.evidence_source)
      ? {
          evidence_source:
            record.evidence_source as TAdminSkillDto["evidence_source"],
        }
      : {}),
    ...(optionalText(record.evidence_reference)
      ? { evidence_reference: optionalText(record.evidence_reference) }
      : {}),
    ...(record.evidence_verified_at
      ? { evidence_verified_at: toIso(record.evidence_verified_at) }
      : {}),
    ...(record.evidence_verified_by
      ? { evidence_verified_by: toId(record.evidence_verified_by) }
      : {}),
    ...(typeof record.years_experience === "number"
      ? { years_experience: record.years_experience }
      : {}),
    keywords: stringList(record.keywords),
    ...(toOptionalFileId(record.icon_file)
      ? { icon_file: toOptionalFileId(record.icon_file) }
      : {}),
  }),
} as const satisfies TRepeatableDefinition<
  TSkill,
  TPublicSkillDto,
  TAdminSkillDto
>;
