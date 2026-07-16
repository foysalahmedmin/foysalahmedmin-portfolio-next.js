import {
  optionalText,
  stringList,
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
import Testimonial from "./testimonial.model";
import {
  TESTIMONIAL_RELATIONSHIPS,
  type TAdminTestimonialDto,
  type TPublicTestimonialDto,
  type TTestimonial,
} from "./testimonial.type";
import {
  createTestimonialSchema,
  updateTestimonialSchema,
} from "./testimonial.validation";

export const testimonialDefinition = {
  domain: "testimonial",
  plural: "Testimonials",
  model_name: "Testimonial",
  collection_name: "testimonials",
  cache_tag: "portfolio:v1:testimonials",
  model: Testimonial,
  create_schema: createTestimonialSchema,
  update_schema: updateTestimonialSchema,
  public_fields: [
    "quote",
    "person_name",
    "person_role",
    "organization",
    "relationship",
    "source_label",
    "source_url",
    "consent_scopes",
  ],
  public_filter: {
    claim_verification: "verified",
    consent_status: "granted",
    consent_scopes: "public_site",
  },
  search_fields: ["title", "summary", "quote", "person_name", "organization"],
  filter_rules: {
    consent: {
      field: "consent_status",
      kind: "enum",
      values: ["pending", "granted", "revoked"],
      public: false,
    },
    verification: {
      field: "claim_verification",
      kind: "enum",
      values: ["unverified", "verified"],
      public: false,
    },
    relationship: {
      field: "relationship",
      kind: "enum",
      values: TESTIMONIAL_RELATIONSHIPS,
    },
    featured: { field: "is_featured", kind: "boolean" },
    status: {
      field: "status",
      kind: "enum",
      values: REPEATABLE_CONTENT_STATUSES,
      public: false,
    },
  },
  sort_fields: ["sequence", "title", "published_at", "updated_at"],
  file_fields: [
    {
      field: "avatar_file",
      cardinality: "one",
      purposes: ["testimonial"],
      public: true,
    },
    {
      field: "proof_file",
      cardinality: "one",
      purposes: ["testimonial", "document"],
      public: false,
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    for (const field of [
      "quote",
      "person_name",
      "relationship",
      "source_type",
      "source_reference",
    ] as const) {
      if (!optionalText(record[field])) issues.push(field);
    }
    if (record.claim_verification !== "verified")
      issues.push("claim_verification");
    if (record.consent_status !== "granted") issues.push("consent_status");
    if (!stringList(record.consent_scopes).includes("public_site")) {
      issues.push("consent_scopes");
    }
    if (!record.consented_at) issues.push("consented_at");
    if (!record.verified_at || !record.verified_by) issues.push("verification");
    return issues;
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicTestimonialDto => {
    const mayAttribute = stringList(record.consent_scopes).includes(
      "source_attribution"
    );
    const source = mayAttribute
      ? {
          ...(optionalText(record.source_label)
            ? { label: optionalText(record.source_label) }
            : {}),
          ...(optionalText(record.source_url)
            ? { url: optionalText(record.source_url) }
            : {}),
        }
      : undefined;
    return {
      ...toPublicBaseDto(record),
      quote: String(record.quote),
      person_name: String(record.person_name),
      ...(optionalText(record.person_role)
        ? { person_role: optionalText(record.person_role) }
        : {}),
      ...(optionalText(record.organization)
        ? { organization: optionalText(record.organization) }
        : {}),
      relationship:
        record.relationship as TPublicTestimonialDto["relationship"],
      verified: true,
      ...(source && Object.keys(source).length ? { source } : {}),
      ...(toPublicMediaDto(record.avatar_file)
        ? { avatar: toPublicMediaDto(record.avatar_file) }
        : {}),
    };
  },
  to_admin_dto: (
    record: Readonly<Record<string, unknown>>
  ): TAdminTestimonialDto => ({
    ...toAdminBaseDto(record),
    quote: String(record.quote),
    person_name: String(record.person_name),
    ...(optionalText(record.person_role)
      ? { person_role: optionalText(record.person_role) }
      : {}),
    ...(optionalText(record.organization)
      ? { organization: optionalText(record.organization) }
      : {}),
    relationship: record.relationship as TAdminTestimonialDto["relationship"],
    source_type: record.source_type as TAdminTestimonialDto["source_type"],
    ...(optionalText(record.source_reference)
      ? { source_reference: optionalText(record.source_reference) }
      : {}),
    ...(optionalText(record.source_label)
      ? { source_label: optionalText(record.source_label) }
      : {}),
    ...(optionalText(record.source_url)
      ? { source_url: optionalText(record.source_url) }
      : {}),
    consent_status:
      record.consent_status as TAdminTestimonialDto["consent_status"],
    consent_scopes: stringList(
      record.consent_scopes
    ) as TAdminTestimonialDto["consent_scopes"],
    ...(record.consented_at
      ? { consented_at: toIso(record.consented_at) }
      : {}),
    ...(record.verified_at ? { verified_at: toIso(record.verified_at) } : {}),
    ...(record.verified_by ? { verified_by: toId(record.verified_by) } : {}),
    ...(toOptionalFileId(record.avatar_file)
      ? { avatar_file: toOptionalFileId(record.avatar_file) }
      : {}),
    ...(toOptionalFileId(record.proof_file)
      ? { proof_file: toOptionalFileId(record.proof_file) }
      : {}),
  }),
} as const satisfies TRepeatableDefinition<
  TTestimonial,
  TPublicTestimonialDto,
  TAdminTestimonialDto
>;
