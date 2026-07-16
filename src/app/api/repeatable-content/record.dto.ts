import type { PillarKey } from "@/lib/content/pillars";
import type {
  TAdminRepeatableBaseDto,
  TPublicMediaDto,
  TPublicRepeatableBaseDto,
  TRepeatableContentStatus,
  TClaimVerificationState,
} from "./record.type";

type UnknownRecord = Readonly<Record<string, unknown>>;

export const toId = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const object = value as {
      _id?: unknown;
      toHexString?: () => string;
    };
    if (typeof object.toHexString === "function") return object.toHexString();
    if (object._id && object._id !== value) return toId(object._id);
    const serialized = String(value);
    if (serialized !== "[object Object]") return serialized;
  }
  return "";
};

export const toIso = (value: unknown): string => {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
};

export const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const toPublicMediaDto = (
  value: unknown
): TPublicMediaDto | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const file = value as Record<string, unknown>;
  const id = toId(file._id);
  if (!id || typeof file.url !== "string" || !file.url) return undefined;
  const metadata =
    file.metadata && typeof file.metadata === "object"
      ? (file.metadata as Record<string, unknown>)
      : {};
  const focalPoint =
    file.focal_point && typeof file.focal_point === "object"
      ? (file.focal_point as Record<string, unknown>)
      : undefined;
  return {
    id,
    url: file.url,
    ...(optionalText(file.alt_text)
      ? { alt_text: optionalText(file.alt_text) }
      : {}),
    ...(typeof file.is_decorative === "boolean"
      ? { is_decorative: file.is_decorative }
      : {}),
    ...(typeof metadata.width === "number" ? { width: metadata.width } : {}),
    ...(typeof metadata.height === "number" ? { height: metadata.height } : {}),
    ...(focalPoint &&
    typeof focalPoint.x === "number" &&
    typeof focalPoint.y === "number"
      ? { focal_point: { x: focalPoint.x, y: focalPoint.y } }
      : {}),
    ...(optionalText(file.dominant_color)
      ? { dominant_color: optionalText(file.dominant_color) }
      : {}),
    ...(optionalText(file.blur_data_url)
      ? { blur_data_url: optionalText(file.blur_data_url) }
      : {}),
  };
};

type PublicBaseWithoutPublication = Omit<
  TPublicRepeatableBaseDto,
  "published_at"
>;

const toSharedBaseDto = (
  record: UnknownRecord
): PublicBaseWithoutPublication => ({
  slug: String(record.slug),
  locale: "en",
  title: String(record.title),
  ...(optionalText(record.summary)
    ? { summary: optionalText(record.summary) }
    : {}),
  ...(optionalText(record.primary_pillar)
    ? { primary_pillar: record.primary_pillar as PillarKey }
    : {}),
  secondary_pillars: stringList(record.secondary_pillars) as PillarKey[],
  sequence: Number(record.sequence),
  is_featured: Boolean(record.is_featured),
});

export const toPublicBaseDto = (
  record: UnknownRecord
): TPublicRepeatableBaseDto => ({
  ...toSharedBaseDto(record),
  published_at: toIso(record.published_at),
});

export const toAdminBaseDto = (
  record: UnknownRecord
): TAdminRepeatableBaseDto => ({
  ...toSharedBaseDto(record),
  id: toId(record._id),
  status: record.status as TRepeatableContentStatus,
  enabled: Boolean(record.enabled),
  claim_verification: record.claim_verification as TClaimVerificationState,
  version: Number(record.version),
  ...(record.published_at ? { published_at: toIso(record.published_at) } : {}),
  ...(record.first_published_at
    ? { first_published_at: toIso(record.first_published_at) }
    : {}),
  created_by: toId(record.created_by),
  updated_by: toId(record.updated_by),
  is_deleted: Boolean(record.is_deleted),
  ...(record.deleted_at ? { deleted_at: toIso(record.deleted_at) } : {}),
  created_at: toIso(record.created_at),
  updated_at: toIso(record.updated_at),
});

export const toOptionalFileId = (value: unknown): string | undefined => {
  const id = toId(value);
  return id || undefined;
};
