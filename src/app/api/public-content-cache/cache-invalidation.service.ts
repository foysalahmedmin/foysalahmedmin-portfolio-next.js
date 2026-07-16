import { randomUUID } from "node:crypto";
import connectDB from "@/lib/db";
import {
  LEGACY_PUBLIC_CONTENT_CACHE_TAGS,
  type TLegacyPublicContentDomain,
} from "@/lib/content/public-cache-tags";
import { revalidateTag } from "next/cache";
import * as Repository from "./cache-invalidation.repository";

const deliver = async (intent: {
  id: string;
  tag: string;
}): Promise<boolean> => {
  try {
    revalidateTag(intent.tag, "max");
    await Repository.markDelivered(intent.id);
    return true;
  } catch {
    await Repository.markFailed(intent.id).catch(() => undefined);
    return false;
  }
};

export const invalidatePublicContentAfterCommit = async (
  domain: TLegacyPublicContentDomain
): Promise<boolean> => {
  await connectDB();
  const tag = LEGACY_PUBLIC_CONTENT_CACHE_TAGS[domain];
  const id = await Repository.createIntent({
    event_key: randomUUID(),
    domain,
    tag,
  });
  return await deliver({ id, tag });
};

export const retryPendingPublicContentInvalidations = async (
  limit = 10
): Promise<{ attempted: number; delivered: number }> => {
  await connectDB();
  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 1;
  const boundedLimit = Math.min(25, Math.max(1, normalizedLimit));
  const intents = await Repository.findPending(new Date(), boundedLimit);
  let delivered = 0;
  for (const intent of intents) {
    if (await deliver(intent)) delivered += 1;
  }
  return { attempted: intents.length, delivered };
};
