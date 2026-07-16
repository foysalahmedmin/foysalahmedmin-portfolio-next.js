import { createRecordService } from "../repeatable-content/record.service";
import { skillDefinition } from "./skill.definition";
import { SkillRepository } from "./skill.repository";

export const SkillService = createRecordService(
  skillDefinition,
  SkillRepository
);
