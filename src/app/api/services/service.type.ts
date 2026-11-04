import type { TContentIconKey } from "../repeatable-content/record.constants";
import type {
  TAdminRepeatableBaseDto,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export const SERVICE_PROBLEMS_MAX = 5;

export type TServiceProblem = {
  key: string;
  pain: string;
  approach: string;
  deliverable?: string;
  outcome?: string;
  case_slug?: string;
};

export type TService = TRepeatableRecord & {
  outcome: string;
  capabilities: string[];
  deliverables: string[];
  technologies: string[];
  problems?: TServiceProblem[];
  icon_key?: TContentIconKey;
  visual_file?: unknown;
};

export type TPublicServiceDto = TPublicRepeatableBaseDto & {
  outcome: string;
  capabilities: string[];
  deliverables: string[];
  technologies: string[];
  problems: TServiceProblem[];
  icon_key?: TContentIconKey;
  visual?: TPublicMediaDto;
};

export type TAdminServiceDto = TAdminRepeatableBaseDto & {
  outcome: string;
  capabilities: string[];
  deliverables: string[];
  technologies: string[];
  problems: TServiceProblem[];
  icon_key?: TContentIconKey;
  visual_file?: string;
};
