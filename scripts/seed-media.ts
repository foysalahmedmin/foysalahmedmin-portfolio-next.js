import path from "node:path";
import type { Db } from "mongodb";
import { SeedError } from "../src/lib/seed/errors.ts";
import type {
  SeedActor,
  SeedManifest,
  SeedMediaGateway,
} from "../src/lib/seed/types.ts";

export const DEFAULT_SEED_MEDIA_ASSET_ROOT = "seed-assets" as const;

const SAFE_RELATIVE_ASSET_ROOT =
  /^[a-zA-Z0-9][a-zA-Z0-9._/-]*(?:[a-zA-Z0-9._-])?$/;

export const resolveSeedMediaAssetRoot = (input: {
  repository_root: string;
  configured_root?: string;
}): string => {
  const relativeRoot =
    input.configured_root?.trim() || DEFAULT_SEED_MEDIA_ASSET_ROOT;
  if (
    path.isAbsolute(relativeRoot) ||
    path.win32.isAbsolute(relativeRoot) ||
    relativeRoot.includes("\\") ||
    relativeRoot
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..") ||
    !SAFE_RELATIVE_ASSET_ROOT.test(relativeRoot)
  ) {
    throw new SeedError(
      "SEED_MEDIA_ASSET_ROOT_INVALID",
      "SEED_MEDIA_ASSET_ROOT must be a safe repository-relative directory."
    );
  }

  const repositoryRoot = path.resolve(input.repository_root);
  const resolvedRoot = path.resolve(repositoryRoot, relativeRoot);
  if (!resolvedRoot.startsWith(`${repositoryRoot}${path.sep}`)) {
    throw new SeedError(
      "SEED_MEDIA_ASSET_ROOT_INVALID",
      "SEED_MEDIA_ASSET_ROOT must remain inside the repository."
    );
  }
  return resolvedRoot;
};

type ManagedMediaSeedGatewayFactory = (input: {
  actor: SeedActor;
  asset_root: string;
  repository_root: string;
  db: Db;
}) => SeedMediaGateway;

const loadManagedMediaSeedGatewayFactory = async (): Promise<
  ManagedMediaSeedGatewayFactory
> => {
  const gatewayModule = await import(
    "../src/app/api/files/managed-media.seed-gateway.ts"
  );
  return gatewayModule.createManagedMediaSeedGateway;
};

export const createSeedMediaGateway = async (input: {
  actor: SeedActor;
  configured_asset_root?: string;
  db: Db;
  manifest: SeedManifest;
  repository_root: string;
  load_factory?: () => Promise<ManagedMediaSeedGatewayFactory>;
}): Promise<SeedMediaGateway | undefined> => {
  if (
    !input.manifest.media.some(
      (request) => request.source.kind === "repository_file"
    )
  ) {
    return undefined;
  }

  const assetRoot = resolveSeedMediaAssetRoot({
    repository_root: input.repository_root,
    configured_root: input.configured_asset_root,
  });
  const factory = await (input.load_factory ??
    loadManagedMediaSeedGatewayFactory)();
  return factory({
    actor: input.actor,
    asset_root: assetRoot,
    repository_root: path.resolve(input.repository_root),
    db: input.db,
  });
};
