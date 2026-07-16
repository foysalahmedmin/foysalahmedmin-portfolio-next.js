import type { TContentIconKey } from "../repeatable-content/record.constants";
import type {
  TAdminRepeatableBaseDto,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export type TSkillGroup = TRepeatableRecord & {
  description: string;
  icon_key?: TContentIconKey;
  visual_file?: unknown;
};

export type TPublicSkillGroupDto = TPublicRepeatableBaseDto & {
  description: string;
  icon_key?: TContentIconKey;
  visual?: TPublicMediaDto;
};

export type TAdminSkillGroupDto = TAdminRepeatableBaseDto & {
  description: string;
  icon_key?: TContentIconKey;
  visual_file?: string;
};
