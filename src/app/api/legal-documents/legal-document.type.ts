import type {
  TAdminRepeatableBaseDto,
  TPublicRepeatableBaseDto,
  TRepeatableRecord,
} from "../repeatable-content/record.type";

export const LEGAL_DOCUMENT_TYPES = [
  "privacy",
  "terms",
  "accessibility",
] as const;
export type TLegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

export type TLegalSection = { key: string; heading: string; body: string };

export type TLegalDocument = TRepeatableRecord & {
  type: TLegalDocumentType;
  document_version: string;
  effective_at: Date | string;
  sections: TLegalSection[];
  reviewed_at?: Date | string;
  reviewed_by?: unknown;
  supersedes?: unknown;
  document_file?: unknown;
};

export type TPublicLegalDocumentDto = TPublicRepeatableBaseDto & {
  type: TLegalDocumentType;
  document_version: string;
  effective_at: string;
  sections: TLegalSection[];
  reviewed_at: string;
};

export type TAdminLegalDocumentDto = TAdminRepeatableBaseDto & {
  type: TLegalDocumentType;
  document_version: string;
  effective_at: string;
  sections: TLegalSection[];
  reviewed_at?: string;
  reviewed_by?: string;
  supersedes?: string;
  document_file?: string;
};
