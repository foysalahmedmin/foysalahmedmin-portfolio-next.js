import ArticleCategory from "@/app/api/article-categories/article-category.model";
import * as FileRepository from "@/app/api/files/file.repository";
import type { TFile, TFilePurpose } from "@/app/api/files/file.type";
import { assertAllowedProviderUrl } from "@/app/api/files/managed-media.policy";
import ProjectCategory from "@/app/api/project-categories/project-category.model";
import {
  getPublicArticleFilter,
  getPublicProjectFilter,
} from "@/app/api/public-visibility";
import Skill from "@/app/api/skills/skill.model";
import { skillDefinition } from "@/app/api/skills/skill.definition";
import { User } from "@/app/api/users/user.model";
import { setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { ClientSession, FilterQuery, Model } from "mongoose";
import { PageDomainError } from "./page.policy";
import { getPageSectionRegistration } from "./page.registry";
import {
  PAGE_GRAPH_RECORD_MAX,
  type TPageDraftSnapshot,
  type TPageReferenceDomain,
  type TPageRouteKey,
  type TPageSection,
  type TPublicPageReference,
} from "./page.type";

type TGraphMode = "draft" | "publish";
type TGraphRecord = Readonly<Record<string, unknown>> & {
  _id: unknown;
  slug?: unknown;
};

export type TPageGraph = Readonly<{
  references_by_section: ReadonlyMap<string, readonly TPublicPageReference[]>;
  inspected_records: number;
}>;

const id = (value: unknown): string =>
  value && typeof value === "object" && "_id" in value
    ? String((value as { _id: unknown })._id)
    : String(value ?? "");

const ids = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .map(id)
    .filter((value) => /^[a-f0-9]{24}$/i.test(value));

const publicFilter = (
  domain: TPageReferenceDomain,
  extra: Readonly<Record<string, unknown>> | undefined,
  now: Date
): FilterQuery<TGraphRecord> => {
  if (domain === "article") {
    return { ...getPublicArticleFilter(now), is_deleted: false };
  }
  if (domain === "project") {
    return { ...getPublicProjectFilter(), is_deleted: false };
  }
  return {
    locale: "en",
    status: "published",
    enabled: true,
    published_at: { $lte: now },
    is_deleted: false,
    ...(extra ?? {}),
  };
};

const mapAutomaticFilter = (
  filter: Readonly<Record<string, unknown>>
): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    mapped[
      key === "pillar"
        ? "primary_pillar"
        : key === "featured"
          ? "is_featured"
          : key
    ] = value;
  }
  return mapped;
};

const hasAllowedPublicDelivery = (file: TFile): boolean => {
  if (file.provider !== "gcs" && file.provider !== "cloudinary") return false;
  try {
    assertAllowedProviderUrl({
      provider: file.provider,
      url: file.url,
      bucket: file.metadata?.bucket,
      cloud_name: file.metadata?.cloud_name,
    });
    return true;
  } catch {
    return false;
  }
};

const validateFiles = async (
  records: readonly TGraphRecord[],
  fields: readonly Readonly<{
    field: string;
    purposes: readonly TFilePurpose[];
    public: boolean;
  }>[]
): Promise<string[]> => {
  const issues: string[] = [];
  for (const field of fields.filter((candidate) => candidate.public)) {
    const referenced = [
      ...new Set(records.flatMap((record) => ids(record[field.field]))),
    ];
    if (!referenced.length) continue;
    const files = await FileRepository.findAttachableByIds(
      referenced,
      field.purposes
    );
    const eligible = new Set(
      files
        .filter(
          (file) =>
            file.access === "public" &&
            file.status === "active" &&
            file.lifecycle_state === "ready" &&
            file.metadata_status === "complete" &&
            Boolean(file.url) &&
            hasAllowedPublicDelivery(file)
        )
        .map((file) => id(file._id))
    );
    referenced.forEach((fileId) => {
      if (!eligible.has(fileId)) issues.push(field.field);
    });
  }
  return issues;
};

const validateLegacyRelations = async (
  domain: TPageReferenceDomain,
  records: readonly TGraphRecord[]
): Promise<string[]> => {
  if (domain !== "article" && domain !== "project") return [];
  const categoryIds = [
    ...new Set(records.flatMap((record) => ids(record.category))),
  ];
  const authorIds = [
    ...new Set(records.flatMap((record) => ids(record.author))),
  ];
  const Category = domain === "article" ? ArticleCategory : ProjectCategory;
  const categoryQuery = setSoftDeleteScope(
    Category.find({ _id: { $in: categoryIds }, status: "active" }),
    "active",
    { exact_active: true }
  );
  const authorQuery = setSoftDeleteScope(
    User.find({ _id: { $in: authorIds }, status: "in-progress" }),
    "active",
    { exact_active: true }
  );
  const [categories, authors] = await Promise.all([
    categoryQuery.select("_id").lean(),
    authorQuery.select("_id").lean(),
  ]);
  const foundCategories = new Set(categories.map((record) => id(record._id)));
  const foundAuthors = new Set(authors.map((record) => id(record._id)));
  return [
    ...(categoryIds.some((value) => !foundCategories.has(value))
      ? ["category"]
      : []),
    ...(authorIds.some((value) => !foundAuthors.has(value)) ? ["author"] : []),
  ];
};

const validateSkillGroups = async (
  records: readonly TGraphRecord[],
  now: Date
): Promise<string[]> => {
  if (!records.length) return [];
  const groups = records.map((record) => ({
    id: id(record._id),
    pillar: record.primary_pillar,
  }));
  const valid = await setSoftDeleteScope(
    Skill.find({
      $or: groups.map((group) => ({
        group: group.id,
        primary_pillar: group.pillar,
      })),
      ...publicFilter("skill-group", skillDefinition.public_filter, now),
      claim_verification: { $in: ["derived", "verified"] },
    }),
    "active",
    { exact_active: true }
  )
    .select("group")
    .limit(groups.length * 24)
    .lean();
  const represented = new Set(valid.map((record) => id(record.group)));
  return groups.some((group) => !represented.has(group.id)) ? ["skills"] : [];
};

const findSectionRecords = async (
  section: TPageSection,
  mode: TGraphMode,
  now: Date,
  session?: ClientSession
): Promise<TGraphRecord[]> => {
  const registration = getPageSectionRegistration(section.kind);
  if (!registration || section.source.mode === "system") return [];
  const filter: FilterQuery<TGraphRecord> =
    mode === "publish"
      ? publicFilter(
          registration.domain,
          registration.definition.public_filter,
          now
        )
      : { is_deleted: false };
  if (section.source.mode === "curated") {
    filter._id = { $in: section.source.ids };
  } else {
    Object.assign(filter, mapAutomaticFilter(section.source.filter));
  }
  const model = registration.definition.model as Model<TGraphRecord>;
  const query = setSoftDeleteScope(model.find(filter), "active", {
    exact_active: true,
  })
    .select("+is_deleted")
    .sort({ is_featured: -1, sequence: 1, published_at: -1, _id: 1 })
    .limit(
      section.source.mode === "curated"
        ? section.source.ids.length
        : (section.item_limit ?? 1)
    );
  if (session) query.session(session);
  const found = (await query.lean()) as unknown as TGraphRecord[];
  if (section.source.mode !== "curated") return found;
  const byId = new Map(found.map((record) => [id(record._id), record]));
  return section.source.ids.flatMap((recordId) => {
    const record = byId.get(recordId);
    return record ? [record] : [];
  });
};

export const validatePageGraph = async (input: {
  route_key: TPageRouteKey;
  snapshot: TPageDraftSnapshot;
  mode: TGraphMode;
  session?: ClientSession;
  now?: Date;
}): Promise<TPageGraph> => {
  const now = input.now ?? new Date();
  const references = new Map<string, readonly TPublicPageReference[]>();
  const issues: string[] = [];
  let inspected = 0;

  for (let index = 0; index < input.snapshot.sections.length; index += 1) {
    const section = input.snapshot.sections[index]!;
    const registration = getPageSectionRegistration(section.kind);
    if (!registration) {
      references.set(section.key, []);
      continue;
    }
    const records = await findSectionRecords(
      section,
      input.mode,
      now,
      input.session
    );
    inspected += records.length;
    if (inspected > PAGE_GRAPH_RECORD_MAX) {
      throw new PageDomainError({
        status: 422,
        code: "PAGE_GRAPH_BUDGET_EXCEEDED",
        message: "The Page content graph exceeds the bounded query budget.",
        sources: ["sections"],
      });
    }
    const expected =
      section.source.mode === "curated" ? section.source.ids.length : undefined;
    if (expected !== undefined && records.length !== expected) {
      issues.push(`sections.${index}.source.ids`);
    }
    if (
      input.mode === "publish" &&
      section.visible &&
      section.source.mode === "automatic" &&
      records.length === 0
    ) {
      issues.push(`sections.${index}.source.filter`);
    }
    if (input.mode === "publish") {
      for (const record of records) {
        if (!record.slug) issues.push(`sections.${index}.source.slug`);
        const recordIssues = registration.definition.get_publish_issues(record);
        recordIssues.forEach((field) =>
          issues.push(`sections.${index}.source.${field}`)
        );
        const asyncIssues =
          (await registration.definition.get_async_publish_issues?.(record)) ??
          [];
        asyncIssues.forEach((field) =>
          issues.push(`sections.${index}.source.${field}`)
        );
      }
      const relationIssues = await validateLegacyRelations(
        registration.domain,
        records
      );
      relationIssues.forEach((field) =>
        issues.push(`sections.${index}.source.${field}`)
      );
      const fileIssues = await validateFiles(
        records,
        registration.definition.file_fields
      );
      fileIssues.forEach((field) =>
        issues.push(`sections.${index}.source.${field}`)
      );
      if (registration.domain === "skill-group") {
        const skillIssues = await validateSkillGroups(records, now);
        skillIssues.forEach((field) =>
          issues.push(`sections.${index}.source.${field}`)
        );
      }
      if (
        (input.route_key === "privacy" || input.route_key === "terms") &&
        registration.domain === "legal-document" &&
        records.some((record) => record.type !== input.route_key)
      ) {
        issues.push(`sections.${index}.source.type`);
      }
    }
    references.set(
      section.key,
      records.map((record) => ({
        domain: registration.domain,
        slug: String(record.slug ?? ""),
      }))
    );
  }

  if (issues.length) {
    throw new PageDomainError({
      status: 422,
      code:
        input.mode === "publish"
          ? "PAGE_PUBLISH_GRAPH_INVALID"
          : "PAGE_REFERENCE_INVALID",
      message:
        input.mode === "publish"
          ? "The Page cannot be published until its complete content graph is publicly eligible."
          : "One or more Page references are unavailable.",
      sources: issues,
    });
  }
  return { references_by_section: references, inspected_records: inspected };
};
