import {
  optionalText,
  toAdminBaseDto,
  toId,
  toIso,
  toOptionalFileId,
  toPublicBaseDto,
} from "../repeatable-content/record.dto";
import {
  REPEATABLE_CONTENT_STATUSES,
  type TRepeatableDefinition,
} from "../repeatable-content/record.type";
import type { ClientSession } from "mongoose";
import LegalDocument from "./legal-document.model";
import {
  LEGAL_DOCUMENT_TYPES,
  type TAdminLegalDocumentDto,
  type TLegalDocument,
  type TLegalSection,
  type TPublicLegalDocumentDto,
} from "./legal-document.type";
import {
  createLegalDocumentSchema,
  updateLegalDocumentSchema,
} from "./legal-document.validation";

const toSections = (value: unknown): TLegalSection[] =>
  Array.isArray(value)
    ? value.map((section) => {
        const item = section as Record<string, unknown>;
        return {
          key: String(item.key),
          heading: String(item.heading),
          body: String(item.body),
        };
      })
    : [];

const compareDocumentVersions = (left: string, right: string): number => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
};

export const legalDocumentDefinition = {
  domain: "legal-document",
  plural: "Legal documents",
  model_name: "LegalDocument",
  collection_name: "legal_documents",
  cache_tag: "portfolio:v1:legal-documents",
  model: LegalDocument,
  create_schema: createLegalDocumentSchema,
  update_schema: updateLegalDocumentSchema,
  public_fields: [
    "type",
    "document_version",
    "effective_at",
    "sections",
    "reviewed_at",
  ],
  public_filter: {
    reviewed_at: { $type: "date" },
    reviewed_by: { $type: "objectId" },
  },
  is_public_record_eligible: (record) => {
    const effectiveAt = new Date(String(record.effective_at));
    return (
      Number.isFinite(effectiveAt.getTime()) &&
      effectiveAt.getTime() <= Date.now()
    );
  },
  search_fields: ["title", "summary", "sections.heading", "sections.body"],
  filter_rules: {
    type: { field: "type", kind: "enum", values: LEGAL_DOCUMENT_TYPES },
    status: {
      field: "status",
      kind: "enum",
      values: REPEATABLE_CONTENT_STATUSES,
      public: false,
    },
  },
  sort_fields: [
    "sequence",
    "effective_at",
    "title",
    "published_at",
    "updated_at",
  ],
  file_fields: [
    {
      field: "document_file",
      cardinality: "one",
      purposes: ["document"],
      public: false,
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    if (!LEGAL_DOCUMENT_TYPES.includes(record.type as never))
      issues.push("type");
    if (!optionalText(record.document_version)) issues.push("document_version");
    if (!record.effective_at) issues.push("effective_at");
    if (!toSections(record.sections).length) issues.push("sections");
    if (!record.reviewed_at || !record.reviewed_by) issues.push("review");
    return issues;
  },
  get_async_publish_issues: async (
    record: Readonly<Record<string, unknown>>,
    session?: ClientSession
  ) => {
    const supersedesId = toId(record.supersedes);
    if (!supersedesId) return [];
    if (supersedesId === toId(record._id)) return ["supersedes"];
    const query = LegalDocument.findOne({
      _id: supersedesId,
      type: record.type,
    }).select("document_version");
    if (session) query.session(session);
    const previous = await query.lean();
    if (!previous) return ["supersedes"];
    return compareDocumentVersions(
      String(record.document_version),
      String(previous.document_version)
    ) > 0
      ? []
      : ["document_version"];
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicLegalDocumentDto => ({
    ...toPublicBaseDto(record),
    type: record.type as TPublicLegalDocumentDto["type"],
    document_version: String(record.document_version),
    effective_at: toIso(record.effective_at),
    sections: toSections(record.sections),
    reviewed_at: toIso(record.reviewed_at),
  }),
  to_admin_dto: (
    record: Readonly<Record<string, unknown>>
  ): TAdminLegalDocumentDto => ({
    ...toAdminBaseDto(record),
    type: record.type as TAdminLegalDocumentDto["type"],
    document_version: String(record.document_version),
    effective_at: toIso(record.effective_at),
    sections: toSections(record.sections),
    ...(record.reviewed_at ? { reviewed_at: toIso(record.reviewed_at) } : {}),
    ...(record.reviewed_by ? { reviewed_by: toId(record.reviewed_by) } : {}),
    ...(record.supersedes ? { supersedes: toId(record.supersedes) } : {}),
    ...(toOptionalFileId(record.document_file)
      ? { document_file: toOptionalFileId(record.document_file) }
      : {}),
  }),
} as const satisfies TRepeatableDefinition<
  TLegalDocument,
  TPublicLegalDocumentDto,
  TAdminLegalDocumentDto
>;
