import type {
  TAdminRepeatableBaseDto,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export const TESTIMONIAL_RELATIONSHIPS = [
  "client",
  "collaborator",
  "manager",
  "peer",
  "direct_report",
] as const;
export type TTestimonialRelationship =
  (typeof TESTIMONIAL_RELATIONSHIPS)[number];

export const TESTIMONIAL_SOURCE_TYPES = [
  "direct",
  "email",
  "linkedin",
  "public_profile",
  "document",
] as const;
export type TTestimonialSourceType = (typeof TESTIMONIAL_SOURCE_TYPES)[number];

export const TESTIMONIAL_CONSENT_SCOPES = [
  "public_site",
  "marketing",
  "source_attribution",
] as const;
export type TTestimonialConsentScope =
  (typeof TESTIMONIAL_CONSENT_SCOPES)[number];

export type TTestimonial = TRepeatableRecord & {
  quote: string;
  person_name: string;
  person_role?: string;
  organization?: string;
  relationship: TTestimonialRelationship;
  source_type: TTestimonialSourceType;
  source_reference?: string;
  source_label?: string;
  source_url?: string;
  consent_status: "pending" | "granted" | "revoked";
  consent_scopes: TTestimonialConsentScope[];
  consented_at?: Date | string;
  verified_at?: Date | string;
  verified_by?: unknown;
  avatar_file?: unknown;
  proof_file?: unknown;
};

export type TPublicTestimonialDto = TPublicRepeatableBaseDto & {
  quote: string;
  person_name: string;
  person_role?: string;
  organization?: string;
  relationship: TTestimonialRelationship;
  verified: true;
  source?: { label?: string; url?: string };
  avatar?: TPublicMediaDto;
};

export type TAdminTestimonialDto = TAdminRepeatableBaseDto & {
  quote: string;
  person_name: string;
  person_role?: string;
  organization?: string;
  relationship: TTestimonialRelationship;
  source_type: TTestimonialSourceType;
  source_reference?: string;
  source_label?: string;
  source_url?: string;
  consent_status: "pending" | "granted" | "revoked";
  consent_scopes: TTestimonialConsentScope[];
  consented_at?: string;
  verified_at?: string;
  verified_by?: string;
  avatar_file?: string;
  proof_file?: string;
};
