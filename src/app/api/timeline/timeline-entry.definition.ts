import { PILLAR_KEYS } from "@/lib/content/pillars";
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
import TimelineEntry from "./timeline-entry.model";
import {
  TIMELINE_ENTRY_TYPES,
  type TAdminTimelineEntryDto,
  type TPublicTimelineEntryDto,
  type TTimelineEntry,
} from "./timeline-entry.type";
import {
  createTimelineEntrySchema,
  updateTimelineEntrySchema,
} from "./timeline-entry.validation";

export const timelineEntryDefinition = {
  domain: "timeline-entry",
  plural: "Timeline entries",
  model_name: "TimelineEntry",
  collection_name: "timeline_entries",
  cache_tag: "portfolio:v1:timeline",
  model: TimelineEntry,
  create_schema: createTimelineEntrySchema,
  update_schema: updateTimelineEntrySchema,
  public_fields: [
    "type",
    "organization",
    "position",
    "location",
    "started_at",
    "ended_at",
    "is_current",
    "highlights",
    "technologies",
    "claim_verification",
  ],
  public_filter: { claim_verification: { $in: ["derived", "verified"] } },
  search_fields: ["title", "summary", "organization", "position", "highlights"],
  filter_rules: {
    type: { field: "type", kind: "enum", values: TIMELINE_ENTRY_TYPES },
    pillar: { field: "primary_pillar", kind: "enum", values: PILLAR_KEYS },
    featured: { field: "is_featured", kind: "boolean" },
    status: {
      field: "status",
      kind: "enum",
      values: REPEATABLE_CONTENT_STATUSES,
      public: false,
    },
  },
  sort_fields: [
    "sequence",
    "started_at",
    "title",
    "published_at",
    "updated_at",
  ],
  file_fields: [
    {
      field: "visual_file",
      cardinality: "one",
      purposes: ["timeline"],
      public: true,
    },
  ],
  get_publish_issues: (record: Readonly<Record<string, unknown>>) => {
    const issues: string[] = [];
    for (const field of [
      "organization",
      "position",
      "verification_source",
      "verification_reference",
    ] as const) {
      if (!optionalText(record[field])) issues.push(field);
    }
    if (!record.started_at) issues.push("started_at");
    if (!["derived", "verified"].includes(String(record.claim_verification))) {
      issues.push("claim_verification");
    }
    if (
      record.claim_verification === "verified" &&
      (!record.verified_at || !record.verified_by)
    ) {
      issues.push("verification");
    }
    if (record.is_current === true && record.ended_at) issues.push("ended_at");
    return issues;
  },
  to_public_dto: (
    record: Readonly<Record<string, unknown>>
  ): TPublicTimelineEntryDto => ({
    ...toPublicBaseDto(record),
    type: record.type as TPublicTimelineEntryDto["type"],
    organization: String(record.organization),
    position: String(record.position),
    ...(optionalText(record.location)
      ? { location: optionalText(record.location) }
      : {}),
    started_at: toIso(record.started_at),
    ...(record.ended_at ? { ended_at: toIso(record.ended_at) } : {}),
    is_current: Boolean(record.is_current),
    highlights: stringList(record.highlights),
    technologies: stringList(record.technologies),
    verification:
      record.claim_verification as TPublicTimelineEntryDto["verification"],
    ...(toPublicMediaDto(record.visual_file)
      ? { visual: toPublicMediaDto(record.visual_file) }
      : {}),
  }),
  to_admin_dto: (
    record: Readonly<Record<string, unknown>>
  ): TAdminTimelineEntryDto => ({
    ...toAdminBaseDto(record),
    type: record.type as TAdminTimelineEntryDto["type"],
    organization: String(record.organization),
    position: String(record.position),
    ...(optionalText(record.location)
      ? { location: optionalText(record.location) }
      : {}),
    started_at: toIso(record.started_at),
    ...(record.ended_at ? { ended_at: toIso(record.ended_at) } : {}),
    is_current: Boolean(record.is_current),
    highlights: stringList(record.highlights),
    technologies: stringList(record.technologies),
    ...(optionalText(record.verification_source)
      ? {
          verification_source:
            record.verification_source as TAdminTimelineEntryDto["verification_source"],
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
  }),
} as const satisfies TRepeatableDefinition<
  TTimelineEntry,
  TPublicTimelineEntryDto,
  TAdminTimelineEntryDto
>;
