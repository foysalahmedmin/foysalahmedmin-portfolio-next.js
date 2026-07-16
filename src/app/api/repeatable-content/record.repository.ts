import { setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { ClientSession, FilterQuery, Query } from "mongoose";
import type {
  TRepeatableCompositionQuery,
  TRepeatableDefinition,
  TRepeatableListQuery,
  TRepeatableRecord,
} from "./record.type";

const PUBLIC_FILE_FIELDS =
  "_id url alt_text is_decorative focal_point dominant_color blur_data_url metadata.width metadata.height";

const getPopulation = (
  definition: Pick<
    TRepeatableDefinition<any, any, any>,
    "file_fields" | "public_populates"
  >
) => [
  ...definition.file_fields
    .filter((field) => field.public)
    .map((field) => ({
      path: field.field,
      match: {
        status: "active",
        lifecycle_state: "ready",
        access: "public",
        purpose: { $in: field.purposes },
        is_deleted: { $ne: true },
      },
      select: PUBLIC_FILE_FIELDS,
    })),
  ...(definition.public_populates ?? []),
];

const getFilter = (
  definition: Pick<
    TRepeatableDefinition<any, any, any>,
    "filter_rules" | "public_filter"
  >,
  query: TRepeatableListQuery,
  mode: "public" | "admin"
): FilterQuery<TRepeatableRecord> => {
  const filter: FilterQuery<TRepeatableRecord> = {};
  if (mode === "public") {
    Object.assign(filter, {
      locale: "en",
      status: "published",
      enabled: true,
      published_at: { $lte: new Date() },
      ...(definition.public_filter ?? {}),
    });
  }
  for (const [key, value] of Object.entries(query.filters)) {
    const rule = definition.filter_rules[key];
    if (rule) (filter as Record<string, unknown>)[rule.field] = value;
  }
  if (query.search) filter.$text = { $search: query.search };
  return filter;
};

const applyListScope = <T extends Query<unknown, unknown>>(
  query: T,
  scope: TRepeatableListQuery["deleted_scope"]
): T =>
  setSoftDeleteScope(query, scope, {
    exact_active: scope === "active",
  });

export const createRecordRepository = <
  TRecord extends TRepeatableRecord,
  TPublicDto,
  TAdminDto,
>(
  definition: TRepeatableDefinition<TRecord, TPublicDto, TAdminDto>
) => {
  const model = definition.model;
  const publicSelection = [
    "_id",
    "slug",
    "locale",
    "title",
    "summary",
    "primary_pillar",
    "secondary_pillars",
    "sequence",
    "is_featured",
    "published_at",
    ...definition.public_fields,
    ...definition.file_fields
      .filter((field) => field.public)
      .map((field) => field.field),
    ...(definition.public_populates ?? []).map(({ path }) => path),
  ];

  const create = async (
    data: Record<string, unknown>,
    session: ClientSession
  ): Promise<Record<string, unknown>> => {
    const [record] = await model.create([data], { session });
    return record.toObject() as Record<string, unknown>;
  };

  const findById = async (
    id: string,
    scope: "active" | "with_deleted" | "only_deleted" = "active",
    session?: ClientSession
  ): Promise<Record<string, unknown> | null> => {
    const query = setSoftDeleteScope(model.findById(id), scope);
    if (session) query.session(session);
    return (await query.lean()) as Record<string, unknown> | null;
  };

  const findSlugOwner = async (
    locale: string,
    slug: string,
    session?: ClientSession
  ): Promise<string | null> => {
    const query = setSoftDeleteScope(
      model.findOne({ locale, slug }).select("_id"),
      "active",
      { exact_active: true }
    );
    if (session) query.session(session);
    const record = await query.lean();
    return record?._id?.toString() ?? null;
  };

  const findPublicBySlug = async (
    slug: string
  ): Promise<Record<string, unknown> | null> =>
    (await setSoftDeleteScope(
      model.findOne({
        locale: "en",
        slug,
        status: "published",
        enabled: true,
        published_at: { $lte: new Date() },
        ...(definition.public_filter ?? {}),
      }),
      "active",
      { exact_active: true }
    )
      .select(publicSelection.join(" "))
      .populate(getPopulation(definition))
      .lean()) as Record<string, unknown> | null;

  const readPublicComposition = async (
    input: TRepeatableCompositionQuery,
    trustedFilter: Readonly<Record<string, unknown>> = {}
  ): Promise<Record<string, unknown>[]> => {
    const filter: FilterQuery<TRepeatableRecord> = {
      locale: "en",
      status: "published",
      enabled: true,
      published_at: { $lte: new Date() },
      ...(definition.public_filter ?? {}),
      ...trustedFilter,
    };
    for (const [key, value] of Object.entries(input.filters)) {
      const rule = definition.filter_rules[key];
      if (rule && rule.public !== false) {
        (filter as Record<string, unknown>)[rule.field] = value;
      }
    }
    if (input.ids?.length) filter._id = { $in: input.ids };
    const normalizedLimit = Number.isFinite(input.limit)
      ? Math.trunc(input.limit)
      : 1;
    const records = (await setSoftDeleteScope(model.find(filter), "active", {
      exact_active: true,
    })
      .select(publicSelection.join(" "))
      .populate(getPopulation(definition))
      .sort({ sequence: 1, _id: 1 })
      .limit(Math.min(24, Math.max(1, normalizedLimit)))
      .lean()) as unknown as Record<string, unknown>[];
    if (!input.ids?.length) return records;
    const byId = new Map(
      records.map((record) => [String(record._id), record] as const)
    );
    return input.ids.flatMap((recordId) => {
      const record = byId.get(recordId);
      return record ? [record] : [];
    });
  };

  const findPublicForComposition = async (
    input: TRepeatableCompositionQuery
  ): Promise<Record<string, unknown>[]> => await readPublicComposition(input);

  const findPublicForRelatedComposition = async (input: {
    relation_filter: string;
    relation_ids: readonly string[];
    limit: number;
  }): Promise<Record<string, unknown>[]> => {
    const rule = definition.filter_rules[input.relation_filter];
    const relationIds = [...new Set(input.relation_ids)].filter((value) =>
      /^[a-f0-9]{24}$/i.test(value)
    );
    if (
      !rule ||
      rule.kind !== "object_id" ||
      relationIds.length !== input.relation_ids.length ||
      relationIds.length > 24
    ) {
      throw new Error("PUBLIC_COMPOSITION_RELATION_INVALID");
    }
    if (!relationIds.length) return [];
    return await readPublicComposition(
      { limit: input.limit, filters: {} },
      { [rule.field]: { $in: relationIds } }
    );
  };

  const list = async (
    query: TRepeatableListQuery,
    mode: "public" | "admin"
  ): Promise<{
    records: Record<string, unknown>[];
    total: number;
  }> => {
    const filter = getFilter(definition, query, mode);
    const sort: Record<string, 1 | -1> = {
      [query.sort]: query.direction,
      _id: query.direction,
    };
    let findQuery = applyListScope(model.find(filter), query.deleted_scope)
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    if (mode === "public") {
      findQuery = findQuery
        .select(publicSelection.join(" "))
        .populate(getPopulation(definition));
    } else {
      findQuery = findQuery.select("+search_text");
    }
    const totalQuery = applyListScope(
      model.countDocuments(filter),
      query.deleted_scope
    );
    const [records, total] = await Promise.all([findQuery.lean(), totalQuery]);
    return {
      records: records as unknown as Record<string, unknown>[],
      total,
    };
  };

  const updateConditional = async (input: {
    id: string;
    expected_version: number;
    set: Record<string, unknown>;
    session: ClientSession;
    scope?: "active" | "only_deleted";
  }): Promise<Record<string, unknown> | null> => {
    const query = setSoftDeleteScope(
      model.findOneAndUpdate(
        { _id: input.id, version: input.expected_version },
        { $set: input.set, $inc: { version: 1 } },
        {
          new: true,
          runValidators: true,
          session: input.session,
        }
      ),
      input.scope ?? "active"
    );
    return (await query.lean()) as Record<string, unknown> | null;
  };

  const permanentDeleteConditional = async (input: {
    id: string;
    expected_version: number;
    session: ClientSession;
  }): Promise<Record<string, unknown> | null> =>
    (await setSoftDeleteScope(
      model.findOneAndDelete(
        { _id: input.id, version: input.expected_version },
        { session: input.session }
      ),
      "only_deleted"
    ).lean()) as Record<string, unknown> | null;

  const explainPrimaryQueryShapes = async () => {
    const publicFilter = {
      locale: "en",
      status: "published",
      enabled: true,
      published_at: { $lte: new Date() },
      ...(definition.public_filter ?? {}),
      is_deleted: false,
    };
    const [publicPlan, adminPlan] = await Promise.all([
      setSoftDeleteScope(model.find(publicFilter), "active", {
        exact_active: true,
      })
        .sort({ sequence: 1, _id: 1 })
        .limit(50)
        .explain("executionStats"),
      setSoftDeleteScope(model.find({ is_deleted: false }), "active", {
        exact_active: true,
      })
        .sort({ updated_at: -1, _id: 1 })
        .limit(50)
        .explain("executionStats"),
    ]);
    return { public: publicPlan, admin: adminPlan };
  };

  return {
    create,
    findById,
    findSlugOwner,
    findPublicBySlug,
    findPublicForComposition,
    findPublicForRelatedComposition,
    list,
    updateConditional,
    permanentDeleteConditional,
    explainPrimaryQueryShapes,
  };
};

export type TRecordRepository = ReturnType<typeof createRecordRepository>;
