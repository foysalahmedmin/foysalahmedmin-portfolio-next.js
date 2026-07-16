import type {
  TAdminRepeatableBaseDto,
  TClaimVerificationState,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export const TIMELINE_ENTRY_TYPES = ["experience", "education"] as const;
export type TTimelineEntryType = (typeof TIMELINE_ENTRY_TYPES)[number];

export type TTimelineEntry = TRepeatableRecord & {
  type: TTimelineEntryType;
  organization: string;
  position: string;
  location?: string;
  started_at: Date | string;
  ended_at?: Date | string | null;
  is_current: boolean;
  highlights: string[];
  technologies: string[];
  verification_source?: "document" | "public_record" | "manual_review";
  verification_reference?: string;
  verified_at?: Date | string;
  verified_by?: unknown;
  visual_file?: unknown;
};

export type TPublicTimelineEntryDto = TPublicRepeatableBaseDto & {
  type: TTimelineEntryType;
  organization: string;
  position: string;
  location?: string;
  started_at: string;
  ended_at?: string;
  is_current: boolean;
  highlights: string[];
  technologies: string[];
  verification: Exclude<
    TClaimVerificationState,
    "unverified" | "not_applicable"
  >;
  visual?: TPublicMediaDto;
};

export type TAdminTimelineEntryDto = TAdminRepeatableBaseDto & {
  type: TTimelineEntryType;
  organization: string;
  position: string;
  location?: string;
  started_at: string;
  ended_at?: string;
  is_current: boolean;
  highlights: string[];
  technologies: string[];
  verification_source?: "document" | "public_record" | "manual_review";
  verification_reference?: string;
  verified_at?: string;
  verified_by?: string;
  visual_file?: string;
};
