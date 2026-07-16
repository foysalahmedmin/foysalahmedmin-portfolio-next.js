import { createRecordRepository } from "../repeatable-content/record.repository";
import { skillDefinition } from "./skill.definition";

export const SkillRepository = createRecordRepository(skillDefinition);
