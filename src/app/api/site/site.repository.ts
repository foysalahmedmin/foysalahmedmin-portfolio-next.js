import type { ClientSession } from "mongoose";
import Site from "./site.model";
import SiteCacheInvalidation from "./site-cache-invalidation.model";
import {
  SITE_KEY,
  type TSite,
  type TSiteDraftSnapshot,
  type TSitePublishedSnapshot,
} from "./site.type";

export const createSingleton = async (
  input: Pick<TSite, "draft" | "created_by" | "updated_by">,
  session: ClientSession
): Promise<TSite> => {
  const [site] = await Site.create(
    [
      {
        site_key: SITE_KEY,
        schema_version: 1,
        contract_version: 1,
        revision: 1,
        draft: input.draft,
        published: null,
        created_by: input.created_by,
        updated_by: input.updated_by,
      },
    ],
    { session }
  );
  return site.toObject();
};

export const findAdmin = async (
  session?: ClientSession
): Promise<TSite | null> => {
  const query = Site.findOne({ site_key: SITE_KEY }).lean();
  if (session) query.session(session);
  return await query;
};

export const findRevision = async (
  session?: ClientSession
): Promise<number | null> => {
  const query = Site.findOne({ site_key: SITE_KEY }).select("revision");
  if (session) query.session(session);
  const site = await query.lean();
  return site?.revision ?? null;
};

export const findPublished = async (): Promise<TSite | null> =>
  await Site.findOne({
    site_key: SITE_KEY,
    "published.revision": { $type: "number" },
  })
    .select("site_key schema_version contract_version published")
    .lean();

export const updateDraftConditional = async (input: {
  expected_revision: number;
  draft: TSiteDraftSnapshot;
  updated_by: string;
  session: ClientSession;
}): Promise<TSite | null> =>
  await Site.findOneAndUpdate(
    { site_key: SITE_KEY, revision: input.expected_revision },
    {
      $set: { draft: input.draft, updated_by: input.updated_by },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true, session: input.session }
  ).lean();

export const publishConditional = async (input: {
  expected_revision: number;
  published: TSitePublishedSnapshot;
  updated_by: string;
  session: ClientSession;
}): Promise<TSite | null> =>
  await Site.findOneAndUpdate(
    {
      site_key: SITE_KEY,
      revision: input.expected_revision,
      "published.revision": { $ne: input.expected_revision },
    },
    {
      $set: {
        published: input.published,
        updated_by: input.updated_by,
      },
    },
    { new: true, runValidators: true, session: input.session }
  ).lean();

export const createCacheInvalidationIntent = async (input: {
  site: string;
  revision: number;
  correlation_id: string;
  session: ClientSession;
}): Promise<void> => {
  await SiteCacheInvalidation.create(
    [
      {
        site: input.site,
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
  site: string,
  revision: number
): Promise<void> => {
  await SiteCacheInvalidation.updateOne(
    { site, revision, status: "pending" },
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
  site: string,
  revision: number,
  now = new Date()
): Promise<void> => {
  await SiteCacheInvalidation.updateOne(
    { site, revision, status: "pending" },
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
  Array<{ site: string; revision: number; correlation_id: string }>
> => {
  const records = await SiteCacheInvalidation.find({
    status: "pending",
    next_attempt_at: { $lte: now },
  })
    .select("site revision correlation_id")
    .sort({ next_attempt_at: 1, created_at: 1 })
    .limit(Math.min(25, Math.max(1, limit)))
    .lean();
  return records.map((record) => ({
    site: record.site.toString(),
    revision: record.revision,
    correlation_id: record.correlation_id,
  }));
};
