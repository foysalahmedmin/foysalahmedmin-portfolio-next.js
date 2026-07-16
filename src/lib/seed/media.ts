import { SeedError } from "./errors.ts";
import type {
  SeedMediaGateway,
  SeedMediaPlan,
  SeedMediaRequest,
} from "./types.ts";

const pendingPlan = (request: SeedMediaRequest): SeedMediaPlan => ({
  media_key: request.media_key,
  action: "pending_source",
});

export const inspectSeedMedia = async (
  requests: readonly SeedMediaRequest[],
  gateway?: SeedMediaGateway
): Promise<SeedMediaPlan[]> => {
  const plans: SeedMediaPlan[] = [];
  for (const request of requests) {
    if (request.source.kind === "pending_generated") {
      plans.push(pendingPlan(request));
      continue;
    }
    if (!gateway) {
      throw new SeedError(
        "SEED_MEDIA_GATEWAY_REQUIRED",
        "Repository media can be inspected only through a managed-media seed gateway.",
        [request.media_key]
      );
    }
    const item = await gateway.inspect(request);
    if (item.media_key !== request.media_key) {
      throw new SeedError(
        "SEED_MEDIA_STAGE_FAILED",
        "Managed-media inspection returned a mismatched stable key.",
        [request.media_key]
      );
    }
    plans.push(item);
  }
  return plans;
};

export const compensateSeedMedia = async (
  staged: readonly SeedMediaPlan[],
  gateway: SeedMediaGateway
): Promise<void> => {
  for (const item of [...staged].reverse()) {
    if (!item.created_by_run) continue;
    await gateway.compensate(item).catch(() => undefined);
  }
};

export const stageSeedMedia = async (
  requests: readonly SeedMediaRequest[],
  gateway?: SeedMediaGateway
): Promise<SeedMediaPlan[]> => {
  const staged: SeedMediaPlan[] = [];
  for (const request of requests) {
    if (request.source.kind === "pending_generated") {
      staged.push(pendingPlan(request));
      continue;
    }
    if (!gateway) {
      throw new SeedError(
        "SEED_MEDIA_GATEWAY_REQUIRED",
        "Repository media can be staged only through a managed-media seed gateway.",
        [request.media_key]
      );
    }
    try {
      const item = await gateway.stage(request);
      if (
        item.media_key !== request.media_key ||
        !item.file_id ||
        !["existing", "created"].includes(item.action)
      ) {
        throw new Error(
          "managed-media gateway returned an invalid stage result"
        );
      }
      staged.push(item);
    } catch {
      await compensateSeedMedia(staged, gateway);
      throw new SeedError(
        "SEED_MEDIA_STAGE_FAILED",
        "Managed-media staging failed and cleanup of newly staged assets was attempted.",
        [request.media_key]
      );
    }
  }
  return staged;
};
