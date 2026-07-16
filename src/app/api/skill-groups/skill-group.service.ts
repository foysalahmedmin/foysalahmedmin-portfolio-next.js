import connectDB from "@/lib/db";
import { createRecordService } from "../repeatable-content/record.service";
import { ContentRecordError } from "../repeatable-content/record.error";
import type { TRepeatableCompositionQuery } from "../repeatable-content/record.type";
import { skillDefinition } from "../skills/skill.definition";
import { SkillRepository } from "../skills/skill.repository";
import type { TPublicSkillDto } from "../skills/skill.type";
import { skillGroupDefinition } from "./skill-group.definition";
import { SkillGroupRepository } from "./skill-group.repository";
import type { TPublicSkillGroupDto } from "./skill-group.type";

export const SkillGroupService = createRecordService(
  skillGroupDefinition,
  SkillGroupRepository
);

export const PAGE_COMPOSITION_SKILL_LIMIT = 24;

export type TPublicSkillGroupCompositionDto = TPublicSkillGroupDto & {
  skills: readonly TPublicSkillDto[];
};

const normalizeCompositionInput = (
  input: TRepeatableCompositionQuery
): TRepeatableCompositionQuery => {
  const normalizedLimit = Number.isFinite(input.limit)
    ? Math.trunc(input.limit)
    : 1;
  const ids = input.ids
    ? [...new Set(input.ids)].filter((value) => /^[a-f0-9]{24}$/i.test(value))
    : undefined;
  if (input.ids && ids?.length !== input.ids.length) {
    throw new ContentRecordError({
      status: 422,
      code: "CONTENT_COMPOSITION_INPUT_INVALID",
      message: "Page composition references are invalid.",
    });
  }
  return {
    ...(ids ? { ids } : {}),
    limit: Math.min(24, Math.max(1, normalizedLimit)),
    filters: input.filters,
  };
};

export const getPublicSkillGroupsForComposition = async (
  unsafeInput: TRepeatableCompositionQuery
): Promise<TPublicSkillGroupCompositionDto[]> => {
  const input = normalizeCompositionInput(unsafeInput);
  await connectDB();
  const groupRecords =
    await SkillGroupRepository.findPublicForComposition(input);
  const groups = groupRecords.map((record) => ({
    id: String(record._id),
    dto: skillGroupDefinition.to_public_dto(record),
  }));
  const skillRecords = await SkillRepository.findPublicForRelatedComposition({
    relation_filter: "group",
    relation_ids: groups.map(({ id }) => id),
    limit: PAGE_COMPOSITION_SKILL_LIMIT,
  });
  const skills = skillRecords
    .filter((record) =>
      skillDefinition.is_public_record_eligible
        ? skillDefinition.is_public_record_eligible(record)
        : true
    )
    .map(skillDefinition.to_public_dto);
  const skillsByGroup = new Map<string, TPublicSkillDto[]>();
  for (const skill of skills) {
    const groupSkills = skillsByGroup.get(skill.group.slug) ?? [];
    groupSkills.push(skill);
    skillsByGroup.set(skill.group.slug, groupSkills);
  }
  return groups.flatMap(({ dto }) => {
    const groupSkills = skillsByGroup.get(dto.slug) ?? [];
    return groupSkills.length ? [{ ...dto, skills: groupSkills }] : [];
  });
};
