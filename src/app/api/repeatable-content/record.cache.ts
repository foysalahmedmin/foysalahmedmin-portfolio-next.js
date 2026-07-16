import { revalidateTag, unstable_cache } from "next/cache";
import type { ClientSession } from "mongoose";
import RepeatableCacheInvalidation from "./cache-invalidation.model";
import type {
  TCacheInvalidationRef,
  TRepeatableContentDomain,
} from "./record.type";

export const REPEATABLE_PUBLIC_LIST_TTL_SECONDS = 15 * 60;

export const createInvalidationIntent = async (input: {
  domain: TRepeatableContentDomain;
  target: string;
  target_version: number;
  tag: string;
  session: ClientSession;
}): Promise<TCacheInvalidationRef> => {
  const [intent] = await RepeatableCacheInvalidation.create(
    [
      {
        domain: input.domain,
        target: input.target,
        target_version: input.target_version,
        tag: input.tag,
        status: "pending",
        attempts: 0,
        next_attempt_at: new Date(),
      },
    ],
    { session: input.session }
  );
  return { id: intent._id.toString(), tag: input.tag };
};

export const deliverInvalidation = async (
  invalidation: TCacheInvalidationRef
): Promise<void> => {
  try {
    revalidateTag(invalidation.tag, "max");
    await RepeatableCacheInvalidation.updateOne(
      { _id: invalidation.id, status: "pending" },
      {
        $set: {
          status: "delivered",
          delivered_at: new Date(),
          last_error_code: null,
        },
        $inc: { attempts: 1 },
      }
    );
  } catch {
    await RepeatableCacheInvalidation.updateOne(
      { _id: invalidation.id, status: "pending" },
      {
        $set: {
          next_attempt_at: new Date(Date.now() + 60_000),
          last_error_code: "framework_invalidation_failed",
        },
        $inc: { attempts: 1 },
      }
    ).catch(() => undefined);
  }
};

export const deliverInvalidations = async (
  invalidations: readonly TCacheInvalidationRef[]
): Promise<void> => {
  for (const invalidation of invalidations) {
    await deliverInvalidation(invalidation);
  }
};

export const createCachedPublicReader = <TArgument, TResult>(input: {
  cache_key: string;
  tag: string;
  reader: (argument: TArgument) => Promise<TResult>;
}) =>
  unstable_cache(input.reader, [input.cache_key], {
    tags: [input.tag],
    revalidate: REPEATABLE_PUBLIC_LIST_TTL_SECONDS,
  });

export const retryPendingInvalidations = async (
  limit = 10
): Promise<number> => {
  const records = await RepeatableCacheInvalidation.find({
    status: "pending",
    next_attempt_at: { $lte: new Date() },
  })
    .select("_id tag")
    .sort({ next_attempt_at: 1, created_at: 1 })
    .limit(Math.min(25, Math.max(1, limit)))
    .lean();
  for (const record of records) {
    await deliverInvalidation({ id: record._id.toString(), tag: record.tag });
  }
  return records.length;
};
