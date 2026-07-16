import { PILLAR_KEYS } from "@/lib/content/pillars";
import {
  optionalText,
  toAdminBaseDto,
  toId,
  toIso,
  toOptionalFileId,
  toPublicBaseDto,
  toPublicMediaDto,
} from "../repeatable-content/record.dto";
import {
  REPEATABLE_CONTENT_STATUSES,
  type TRepeatableDefinition,
} from "../repeatable-content/record.type";
import Credential from "./credential.model";
import {
  CREDENTIAL_TYPES,
  type TAdminCredentialDto,
  type TCredential,
  type TPublicCredentialDto,
} from "./credential.type";
import {
  createCredentialSchema,
  updateCredentialSchema,
} from "./credential.validation";

export const credentialDefinition = {
  domain: "credential",
  plural: "Credentials",
  model_name: "Credential",
  collection_name: "credentials",
  cache_tag: "portfolio:v1:credentials",
  model: Credential,
  create_schema: createCredentialSchema,
  update_schema: updateCredentialSchema,
  public_fields: [
    "type",
    "issuer",
    "issued_at",
    "expires_at",
    "credential_url",
    "claim_verification",
  ],
  public_filter: { claim_verification: "verified" },
  search_fields: ["title", "summary", "issuer"],
  filter_rules: {
    type: { field: "type", kind: "enum", values: CREDENTIAL_TYPES },
    pillar: { field: "primary_pillar", kind: "enum", values: PILLAR_KEYS },
    featured: { field: "is_featured", kind: "boolean" },
    status: {
      field: "status",
      kind: "enum",
      values: REPEATABLE_CONTENT_STATUSES,
      public: false,
    },
  },
  sort_fields: ["sequence", "issued_at", "title", "published_at", "updated_at"],
  file_fields: [
    {
      field: "visual_file",
      cardinality: "one",
      purposes: ["credential"],
      public: true,
    },
    {
      field: "proof_file",
      cardinality: "one",
      purposes: ["credential", "document"],
      public: false,
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    for (const field of [
      "issuer",
      "verification_source",
      "verification_reference",
    ] as const) {
      if (!optionalText(record[field])) issues.push(field);
    }
    if (!record.issued_at) issues.push("issued_at");
    if (record.claim_verification !== "verified")
      issues.push("claim_verification");
    if (!record.verified_at || !record.verified_by) issues.push("verification");
    return issues;
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicCredentialDto => ({
    ...toPublicBaseDto(record),
    type: record.type as TPublicCredentialDto["type"],
    issuer: String(record.issuer),
    issued_at: toIso(record.issued_at),
    ...(record.expires_at ? { expires_at: toIso(record.expires_at) } : {}),
    ...(optionalText(record.credential_url)
      ? { credential_url: optionalText(record.credential_url) }
      : {}),
    verification: "verified",
    ...(toPublicMediaDto(record.visual_file)
      ? { visual: toPublicMediaDto(record.visual_file) }
      : {}),
  }),
  to_admin_dto: (
    record: Readonly<Record<string, unknown>>
  ): TAdminCredentialDto => ({
    ...toAdminBaseDto(record),
    type: record.type as TAdminCredentialDto["type"],
    issuer: String(record.issuer),
    issued_at: toIso(record.issued_at),
    ...(record.expires_at ? { expires_at: toIso(record.expires_at) } : {}),
    ...(optionalText(record.credential_url)
      ? { credential_url: optionalText(record.credential_url) }
      : {}),
    ...(optionalText(record.credential_id)
      ? { credential_id: optionalText(record.credential_id) }
      : {}),
    ...(optionalText(record.verification_source)
      ? {
          verification_source:
            record.verification_source as TAdminCredentialDto["verification_source"],
        }
      : {}),
    ...(optionalText(record.verification_reference)
      ? { verification_reference: optionalText(record.verification_reference) }
      : {}),
    ...(record.verified_at ? { verified_at: toIso(record.verified_at) } : {}),
    ...(record.verified_by ? { verified_by: toId(record.verified_by) } : {}),
    ...(toOptionalFileId(record.visual_file)
      ? { visual_file: toOptionalFileId(record.visual_file) }
      : {}),
    ...(toOptionalFileId(record.proof_file)
      ? { proof_file: toOptionalFileId(record.proof_file) }
      : {}),
  }),
} as const satisfies TRepeatableDefinition<
  TCredential,
  TPublicCredentialDto,
  TAdminCredentialDto
>;
