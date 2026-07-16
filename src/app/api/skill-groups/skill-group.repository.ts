import { createRecordRepository } from "../repeatable-content/record.repository";
import { skillGroupDefinition } from "./skill-group.definition";

export const SkillGroupRepository =
  createRecordRepository(skillGroupDefinition);
