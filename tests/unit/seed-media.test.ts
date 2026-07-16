import type { SeedError } from "@/lib/seed/errors";
import { stageSeedMedia } from "@/lib/seed/media";
import type { SeedMediaGateway, SeedMediaRequest } from "@/lib/seed/types";
import { describe, expect, it, vi } from "vitest";

const checksum = "a".repeat(64);
const requests: SeedMediaRequest[] = ["one", "two"].map((key) => ({
  media_key: `media.${key}`,
  purpose: "hero",
  source: {
    kind: "repository_file",
    relative_path: `seed-assets/${key}.png`,
    source_sha256: checksum,
  },
  metadata: { name: key, source: "generated" },
}));

describe("managed-media seed staging", () => {
  it("compensates assets created earlier in the run when the provider fails", async () => {
    const compensate = vi.fn(async () => undefined);
    let call = 0;
    const gateway: SeedMediaGateway = {
      inspect: vi.fn(),
      stage: vi.fn(async (request) => {
        call += 1;
        if (call === 2) throw new Error("provider detail that must not escape");
        return {
          media_key: request.media_key,
          action: "created" as const,
          file_id: "64b000000000000000000001",
          created_by_run: true,
          source_sha256: checksum,
        };
      }),
      compensate,
    };

    await expect(stageSeedMedia(requests, gateway)).rejects.toEqual(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_MEDIA_STAGE_FAILED",
      })
    );
    expect(compensate).toHaveBeenCalledTimes(1);
    expect(compensate).toHaveBeenCalledWith(
      expect.objectContaining({ media_key: "media.one" })
    );
  });

  it("never permits repository media to bypass a managed-media gateway", async () => {
    await expect(stageSeedMedia(requests)).rejects.toEqual(
      expect.objectContaining<Partial<SeedError>>({
        code: "SEED_MEDIA_GATEWAY_REQUIRED",
      })
    );
  });
});
