import { createRecordController } from "../repeatable-content/record.controller";
import { SkillGroupService } from "./skill-group.service";

export const SkillGroupController = createRecordController(SkillGroupService);
