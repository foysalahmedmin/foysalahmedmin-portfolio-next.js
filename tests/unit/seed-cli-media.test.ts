import {
  createSeedMediaGateway,
  DEFAULT_SEED_MEDIA_ASSET_ROOT,
  resolveSeedMediaAssetRoot,
} from "../../scripts/seed-media";
import { createDemoSeedManifest } from "@/lib/seed";
import type {
  SeedManifest,
  SeedMediaGateway,
  SeedMediaRequest,
} from "@/lib/seed/types";
import { ObjectId, type Db } from "mongodb";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const actor = { _id: new ObjectId(), role: "super-admin" as const };
const pendingManifest = createDemoSeedManifest({
    _id: new ObjectId(),
    role: "super-admin",
  });
const repositoryRequest: SeedMediaRequest = {
  media_key: "hero.system_design",
  purpose: "hero",
  source: {
    kind: "repository_file",
    relative_path: "heroes/system-design.png",
    source_sha256: "a".repeat(64),
  },
  metadata: {
    name: "System design hero",
    source: "generated",
  },
};
const repositoryManifest: SeedManifest = {
  ...pendingManifest,
  media: [repositoryRequest],
};

const gateway = {
  inspect: vi.fn(),
  stage: vi.fn(),
  compensate: vi.fn(),
} satisfies SeedMediaGateway;

describe("seed CLI managed-media boundary", () => {
  it("does not load or construct the managed-media graph for pending-only manifests", async () => {
    const loadFactory = vi.fn();

    await expect(
      createSeedMediaGateway({
        actor,
        configured_asset_root: "../outside",
        db: {} as Db,
        manifest: pendingManifest,
        repository_root: "/repository",
        load_factory: loadFactory,
      })
    ).resolves.toBeUndefined();
    expect(loadFactory).not.toHaveBeenCalled();
  });

  it("constructs one gateway with the safe default repository asset root", async () => {
    const factory = vi.fn(() => gateway);
    const loadFactory = vi.fn(async () => factory);

    await expect(
      createSeedMediaGateway({
        actor,
        db: {} as Db,
        manifest: repositoryManifest,
        repository_root: "/repository",
        load_factory: loadFactory,
      })
    ).resolves.toBe(gateway);

    expect(loadFactory).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledWith({
      actor,
      asset_root: path.resolve("/repository", DEFAULT_SEED_MEDIA_ASSET_ROOT),
      repository_root: "/repository",
      db: {},
    });
  });

  it.each(["/tmp/assets", "../assets", "safe\\assets", "C:\\assets"])(
    "rejects unsafe configured asset root %s",
    (configuredRoot) => {
      expect(() =>
        resolveSeedMediaAssetRoot({
          repository_root: "/repository",
          configured_root: configuredRoot,
        })
      ).toThrowError(
        expect.objectContaining({ code: "SEED_MEDIA_ASSET_ROOT_INVALID" })
      );
    }
  );
});
