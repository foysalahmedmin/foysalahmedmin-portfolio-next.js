import type { ClientSession } from "mongoose";
import PageCacheInvalidation from "./page-cache-invalidation.model";
import Page from "./page.model";
import type {
  TPage,
  TPageDraftSnapshot,
  TPagePublishedSnapshot,
  TPageRouteKey,
} from "./page.type";

export const createPage = async (
  input: {
    route_key: TPageRouteKey;
    draft: TPageDraftSnapshot;
    actor_id: string;
  },
  session: ClientSession
): Promise<TPage> => {
  const [page] = await Page.create(
    [
      {
        route_key: input.route_key,
        locale: "en",
        schema_version: 1,
        contract_version: 1,
        revision: 1,
        draft: input.draft,
        published: null,
        created_by: input.actor_id,
        updated_by: input.actor_id,
      },
    ],
    { session }
  );
  return page.toObject();
};

export const findAdminPage = async (
  routeKey: TPageRouteKey,
  session?: ClientSession
): Promise<TPage | null> => {
  const query = Page.findOne({ route_key: routeKey, locale: "en" });
  if (session) query.session(session);
  return await query.lean();
};

export const findPageRevision = async (
  routeKey: TPageRouteKey,
  session?: ClientSession
): Promise<number | null> => {
  const query = Page.findOne({ route_key: routeKey, locale: "en" }).select(
    "revision"
  );
  if (session) query.session(session);
  const page = await query.lean();
  return page?.revision ?? null;
};

export const findPublishedPage = async (
  routeKey: TPageRouteKey
): Promise<TPage | null> =>
  await Page.findOne({
    route_key: routeKey,
    locale: "en",
    "published.revision": { $type: "number" },
  })
    .select("route_key locale schema_version contract_version published")
    .lean();

export const updateDraftConditional = async (input: {
  route_key: TPageRouteKey;
  expected_revision: number;
  draft: TPageDraftSnapshot;
  actor_id: string;
  session: ClientSession;
}): Promise<TPage | null> =>
  await Page.findOneAndUpdate(
    {
      route_key: input.route_key,
      locale: "en",
      revision: input.expected_revision,
    },
    {
      $set: { draft: input.draft, updated_by: input.actor_id },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true, session: input.session }
  ).lean();

export const publishConditional = async (input: {
  route_key: TPageRouteKey;
  expected_revision: number;
  published: TPagePublishedSnapshot;
  actor_id: string;
  session: ClientSession;
}): Promise<TPage | null> =>
  await Page.findOneAndUpdate(
    {
      route_key: input.route_key,
      locale: "en",
      revision: input.expected_revision,
      "published.revision": { $ne: input.expected_revision },
    },
    { $set: { published: input.published, updated_by: input.actor_id } },
    { new: true, runValidators: true, session: input.session }
  ).lean();

export const createCacheInvalidationIntent = async (input: {
  page: string;
  route_key: TPageRouteKey;
  revision: number;
  correlation_id: string;
  session: ClientSession;
}): Promise<void> => {
  await PageCacheInvalidation.create(
    [
      {
        page: input.page,
        route_key: input.route_key,
        revision: input.revision,
        correlation_id: input.correlation_id,
        status: "pending",
        attempts: 0,
        next_attempt_at: new Date(),
      },
    ],
    { session: input.session }
  );
};

export const markCacheInvalidationDelivered = async (
  page: string,
  revision: number
): Promise<void> => {
  await PageCacheInvalidation.updateOne(
    { page, revision, status: "pending" },
    {
      $set: {
        status: "delivered",
        delivered_at: new Date(),
        last_error_code: null,
      },
      $inc: { attempts: 1 },
    }
  );
};

export const markCacheInvalidationFailed = async (
  page: string,
  revision: number,
  now = new Date()
): Promise<void> => {
  await PageCacheInvalidation.updateOne(
    { page, revision, status: "pending" },
    {
      $set: {
        next_attempt_at: new Date(now.getTime() + 60_000),
        last_error_code: "framework_invalidation_failed",
      },
      $inc: { attempts: 1 },
    }
  );
};

export const findPendingCacheInvalidations = async (
  now = new Date(),
  limit = 10
): Promise<
  Array<{
    page: string;
    route_key: TPageRouteKey;
    revision: number;
    correlation_id: string;
  }>
> => {
  const records = await PageCacheInvalidation.find({
    status: "pending",
    next_attempt_at: { $lte: now },
  })
    .select("page route_key revision correlation_id")
    .sort({ next_attempt_at: 1, created_at: 1 })
    .limit(Math.min(25, Math.max(1, limit)))
    .lean();
  return records.map((record) => ({
    page: record.page.toString(),
    route_key: record.route_key as TPageRouteKey,
    revision: record.revision,
    correlation_id: record.correlation_id,
  }));
};
