import { createRecordController } from "../repeatable-content/record.controller";
import { SkillService } from "./skill.service";

export const SkillController = createRecordController(SkillService);
