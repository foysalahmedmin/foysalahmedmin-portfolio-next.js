import type {
  TAdminRepeatableBaseDto,
  TClaimVerificationState,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export const SKILL_PROFICIENCY_LEVELS = [
  "foundational",
  "working",
  "advanced",
  "expert",
] as const;
export type TSkillProficiencyLevel = (typeof SKILL_PROFICIENCY_LEVELS)[number];

export const SKILL_EVIDENCE_SOURCES = [
  "project",
  "credential",
  "article",
  "work_history",
  "manual_review",
] as const;
export type TSkillEvidenceSource = (typeof SKILL_EVIDENCE_SOURCES)[number];

export type TSkill = TRepeatableRecord & {
  group: unknown;
  proficiency_level: TSkillProficiencyLevel;
  evidence_source?: TSkillEvidenceSource;
  evidence_reference?: string;
  evidence_verified_at?: Date | string;
  evidence_verified_by?: unknown;
  years_experience?: number;
  keywords: string[];
  icon_file?: unknown;
};

export type TPublicSkillDto = TPublicRepeatableBaseDto & {
  group: { slug: string; title: string };
  proficiency_level: TSkillProficiencyLevel;
  proficiency_verification: Exclude<
    TClaimVerificationState,
    "unverified" | "not_applicable"
  >;
  years_experience?: number;
  keywords: string[];
  icon?: TPublicMediaDto;
};

export type TAdminSkillDto = TAdminRepeatableBaseDto & {
  group: string;
  proficiency_level: TSkillProficiencyLevel;
  evidence_source?: TSkillEvidenceSource;
  evidence_reference?: string;
  evidence_verified_at?: string;
  evidence_verified_by?: string;
  years_experience?: number;
  keywords: string[];
  icon_file?: string;
};
