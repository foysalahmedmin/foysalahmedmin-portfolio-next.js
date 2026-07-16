import type { TLegacyPublicContentDomain } from "@/lib/content/public-cache-tags";
import PublicContentCacheInvalidation from "./cache-invalidation.model";

export const createIntent = async (input: {
  event_key: string;
  domain: TLegacyPublicContentDomain;
  tag: string;
}): Promise<string> => {
  const intent = await PublicContentCacheInvalidation.create({
    ...input,
    status: "pending",
    attempts: 0,
    next_attempt_at: new Date(),
  });
  return intent._id.toString();
};

export const markDelivered = async (id: string): Promise<void> => {
  await PublicContentCacheInvalidation.updateOne(
    { _id: id, status: "pending" },
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

export const markFailed = async (
  id: string,
  now = new Date()
): Promise<void> => {
  await PublicContentCacheInvalidation.updateOne(
    { _id: id, status: "pending" },
    {
      $set: {
        next_attempt_at: new Date(now.getTime() + 60_000),
        last_error_code: "framework_invalidation_failed",
      },
      $inc: { attempts: 1 },
    }
  );
};

export const findPending = async (
  now = new Date(),
  limit = 10
): Promise<Array<{ id: string; tag: string }>> => {
  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 1;
  const intents = await PublicContentCacheInvalidation.find({
    status: "pending",
    next_attempt_at: { $lte: now },
  })
    .select("tag")
    .sort({ next_attempt_at: 1, created_at: 1 })
    .limit(Math.min(25, Math.max(1, normalizedLimit)))
    .lean();
  return intents.map((intent) => ({
    id: intent._id.toString(),
    tag: intent.tag,
  }));
};
