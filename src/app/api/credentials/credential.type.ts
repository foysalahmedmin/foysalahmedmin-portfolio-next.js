import type {
  TAdminRepeatableBaseDto,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export const CREDENTIAL_TYPES = ["certification", "course", "award"] as const;
export type TCredentialType = (typeof CREDENTIAL_TYPES)[number];

export type TCredential = TRepeatableRecord & {
  type: TCredentialType;
  issuer: string;
  issued_at: Date | string;
  expires_at?: Date | string | null;
  credential_url?: string;
  credential_id?: string;
  verification_source?: "issuer" | "document" | "manual_review";
  verification_reference?: string;
  verified_at?: Date | string;
  verified_by?: unknown;
  visual_file?: unknown;
  proof_file?: unknown;
};

export type TPublicCredentialDto = TPublicRepeatableBaseDto & {
  type: TCredentialType;
  issuer: string;
  issued_at: string;
  expires_at?: string;
  credential_url?: string;
  verification: "verified";
  visual?: TPublicMediaDto;
};

export type TAdminCredentialDto = TAdminRepeatableBaseDto & {
  type: TCredentialType;
  issuer: string;
  issued_at: string;
  expires_at?: string;
  credential_url?: string;
  credential_id?: string;
  verification_source?: "issuer" | "document" | "manual_review";
  verification_reference?: string;
  verified_at?: string;
  verified_by?: string;
  visual_file?: string;
  proof_file?: string;
};
