import connectDB from "@/lib/db";
import type {
  SeedMediaGateway,
  SeedMediaPlan,
  SeedMediaRequest,
  SeedActor,
} from "@/lib/seed/types";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import type { Db } from "mongodb";
import * as FileRepository from "./file.repository";
import {
  createManagedFilesWithDisposition,
  deleteFile,
  deleteFilePermanent,
} from "./file.service";
import type { TFile, TFilePurpose } from "./file.type";
import { purposeSchema } from "./file.validation";
import { prepareManagedMedia } from "./managed-media.service";

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  ".avif": "image/avif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
};
const MAX_SEED_SOURCE_BYTES = 12 * 1_048_576;

const toManagedMediaActor = (actor: SeedActor): TJwtPayload => ({
  _id: actor._id.toHexString(),
  role: actor.role,
  // createManagedFiles currently accepts the full session DTO even though its
  // managed-media path uses only ID/role. Reserved non-personal sentinels keep
  // the seed actor projection free of an administrator's name and email.
  name: "Managed-media seed runner",
  email: "managed-media-seed@invalid.invalid",
});

const storedIdempotencyKey = (rawKey: string): string =>
  `v1:${createHash("sha256").update(`${rawKey}\0${0}`).digest("hex")}`;

const present = <T>(value: T | undefined): value is T => value !== undefined;

const normalizeDate = (
  value: Date | string | undefined
): string | undefined => {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.valueOf()) ? String(value) : parsed.toISOString();
};

const compactObject = (
  value: Readonly<Record<string, unknown>> | undefined
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => present(item))
  );
};

const seedEditorialProjection = (input: {
  request: SeedMediaRequest;
  source_checksum: string;
}): Record<string, unknown> => ({
  name: input.request.metadata.name,
  source: input.request.metadata.source,
  category: undefined,
  description: undefined,
  caption: undefined,
  alt_text: input.request.metadata.alt_text,
  is_decorative: input.request.metadata.is_decorative,
  focal_point: compactObject(input.request.metadata.focal_point),
  dominant_color: input.request.metadata.dominant_color,
  blur_data_url: input.request.metadata.blur_data_url,
  attribution: compactObject(input.request.metadata.attribution),
  provenance:
    input.request.metadata.source === "generated"
      ? compactObject({
          ...input.request.metadata.provenance,
          generated_at: normalizeDate(
            input.request.metadata.provenance?.generated_at
          ),
          source_checksum: input.source_checksum,
        })
      : undefined,
});

const storedEditorialProjection = (file: TFile): Record<string, unknown> => ({
  name: file.name,
  source: file.source,
  category: file.category,
  description: file.description,
  caption: file.caption,
  alt_text: file.alt_text,
  is_decorative: file.is_decorative,
  focal_point: compactObject(file.focal_point),
  dominant_color: file.dominant_color,
  blur_data_url: file.blur_data_url,
  attribution: compactObject(file.attribution),
  provenance: file.provenance
    ? compactObject({
        ...file.provenance,
        generated_at: normalizeDate(file.provenance.generated_at),
      })
    : undefined,
});

const assertReusableSeedFile = (input: {
  file: TFile | null;
  request: SeedMediaRequest;
  prepared: Awaited<ReturnType<typeof loadPreparedSeedMedia>>["prepared"];
  source_checksum: string;
}): TFile => {
  const { file } = input;
  if (
    !file?._id ||
    file.lifecycle_state !== "ready" ||
    file.status !== "active" ||
    file.is_deleted === true ||
    file.checksum !== input.prepared.checksum ||
    file.purpose !== input.prepared.purpose ||
    file.access !== input.prepared.access ||
    file.mimetype !== input.prepared.mimetype ||
    file.size !== input.prepared.size ||
    file.metadata?.width !== input.prepared.width ||
    file.metadata?.height !== input.prepared.height ||
    file.metadata?.file_type !== input.prepared.file_type ||
    !isDeepStrictEqual(
      storedEditorialProjection(file),
      seedEditorialProjection({
        request: input.request,
        source_checksum: input.source_checksum,
      })
    )
  ) {
    throw new Error(
      "Matching managed media differs from the trusted seed contract"
    );
  }
  return file;
};

const loadPreparedSeedMedia = async (input: {
  request: SeedMediaRequest;
  asset_root: string;
  repository_root: string;
}) => {
  if (input.request.source.kind !== "repository_file") {
    throw new Error("Pending media has no ingestible repository source");
  }
  const source = input.request.source;
  const repositoryRoot = await realpath(path.resolve(input.repository_root));
  const root = await realpath(path.resolve(input.asset_root));
  if (!root.startsWith(`${repositoryRoot}${path.sep}`)) {
    throw new Error(
      "Seed media asset root escapes the canonical repository root"
    );
  }
  const unresolvedSourcePath = path.resolve(root, source.relative_path);
  if (!unresolvedSourcePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Seed media path escapes the configured asset root");
  }
  const sourcePath = await realpath(unresolvedSourcePath);
  if (!sourcePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Seed media symlink escapes the configured asset root");
  }
  const sourceStat = await stat(sourcePath);
  if (
    !sourceStat.isFile() ||
    sourceStat.size <= 0 ||
    sourceStat.size > MAX_SEED_SOURCE_BYTES
  ) {
    throw new Error(
      "Seed media source size is outside the trusted ingestion budget"
    );
  }
  const buffer = await readFile(sourcePath);
  const sourceChecksum = createHash("sha256").update(buffer).digest("hex");
  if (sourceChecksum !== source.source_sha256) {
    throw new Error("Seed media source checksum does not match the manifest");
  }
  const extension = path.extname(sourcePath).toLowerCase();
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) throw new Error("Seed media extension is unsupported");
  const purpose = purposeSchema.parse(input.request.purpose) as TFilePurpose;
  const prepared = await prepareManagedMedia({
    file: new File([buffer], path.basename(sourcePath), { type: mime }),
    purpose,
  });
  return { prepared, sourceChecksum };
};

/**
 * Trusted adapter for future repository-owned seed assets. It deliberately
 * composes the same managed-media preparation/File service used by HTTP
 * uploads; it never calls a storage provider or fetches a URL directly.
 */
export const createManagedMediaSeedGateway = (input: {
  actor: SeedActor;
  asset_root: string;
  repository_root: string;
  db: Db;
}): SeedMediaGateway => {
  const managedMediaActor = toManagedMediaActor(input.actor);
  const prepare = async (request: SeedMediaRequest) => {
    await connectDB();
    return loadPreparedSeedMedia({
      request,
      asset_root: input.asset_root,
      repository_root: input.repository_root,
    });
  };

  const findExisting = async (
    request: SeedMediaRequest,
    prepared: Awaited<ReturnType<typeof loadPreparedSeedMedia>>["prepared"],
    sourceChecksum: string
  ) => {
    const existing = await FileRepository.findReadyDuplicate({
      author: managedMediaActor._id,
      checksum: prepared.checksum,
      purpose: prepared.purpose,
      access: prepared.access,
    });
    if (!existing?._id) return null;
    return assertReusableSeedFile({
      file: await FileRepository.findByIdWithSensitiveProvenance(
        existing._id.toString()
      ),
      request,
      prepared,
      source_checksum: sourceChecksum,
    });
  };

  return {
    inspect: async (request): Promise<SeedMediaPlan> => {
      const { prepared, sourceChecksum } = await prepare(request);
      const existing = await findExisting(request, prepared, sourceChecksum);
      return existing?._id
        ? {
            media_key: request.media_key,
            action: "existing",
            file_id: existing._id.toString(),
            created_by_run: false,
            source_sha256: sourceChecksum,
          }
        : {
            media_key: request.media_key,
            action: "would_create",
            source_sha256: sourceChecksum,
          };
    },
    stage: async (request): Promise<SeedMediaPlan> => {
      const { prepared, sourceChecksum } = await prepare(request);
      const existing = await findExisting(request, prepared, sourceChecksum);
      if (existing?._id) {
        return {
          media_key: request.media_key,
          action: "existing",
          file_id: existing._id.toString(),
          created_by_run: false,
          source_sha256: sourceChecksum,
        };
      }

      const rawIdempotencyKey = `seed:${createHash("sha256")
        .update(`${request.media_key}\0${sourceChecksum}`)
        .digest("hex")}`;
      const priorIdempotent = await FileRepository.findReadyByIdempotencyKey({
        author: managedMediaActor._id,
        idempotency_key: storedIdempotencyKey(rawIdempotencyKey),
      });
      if (priorIdempotent?._id) {
        const reusable = assertReusableSeedFile({
          file: await FileRepository.findByIdWithSensitiveProvenance(
            priorIdempotent._id.toString()
          ),
          request,
          prepared,
          source_checksum: sourceChecksum,
        });
        return {
          media_key: request.media_key,
          action: "existing",
          file_id: reusable._id!.toString(),
          created_by_run: false,
          source_sha256: sourceChecksum,
        };
      }

      const [result] = await createManagedFilesWithDisposition(
        managedMediaActor,
        [{ ...prepared, field_name: "seed_file", storage: {} }],
        {
          name: request.metadata.name,
          purpose: prepared.purpose,
          source: request.metadata.source,
          alt_text: request.metadata.alt_text,
          is_decorative: request.metadata.is_decorative,
          focal_point: request.metadata.focal_point,
          dominant_color: request.metadata.dominant_color,
          blur_data_url: request.metadata.blur_data_url,
          attribution: request.metadata.attribution,
          idempotency_key: rawIdempotencyKey,
          ...(request.metadata.source === "generated"
            ? {
                provenance: {
                  ...request.metadata.provenance,
                  source_checksum: sourceChecksum,
                },
              }
            : {}),
        }
      );
      if (!result?.file._id) {
        throw new Error("Managed-media ingestion returned no File identity");
      }
      try {
        assertReusableSeedFile({
          file: await FileRepository.findByIdWithSensitiveProvenance(
            result.file._id.toString()
          ),
          request,
          prepared,
          source_checksum: sourceChecksum,
        });
      } catch (error) {
        if (result.disposition === "created") {
          await deleteFile(managedMediaActor, result.file._id.toString()).catch(
            () => undefined
          );
          await deleteFilePermanent(result.file._id.toString()).catch(
            () => undefined
          );
        }
        throw error;
      }
      return {
        media_key: request.media_key,
        action: result.disposition === "created" ? "created" : "existing",
        file_id: result.file._id.toString(),
        created_by_run: result.disposition === "created",
        source_sha256: sourceChecksum,
      };
    },
    compensate: async (item): Promise<void> => {
      if (!item.created_by_run || !item.file_id) return;
      await deleteFile(managedMediaActor, item.file_id);
      await deleteFilePermanent(item.file_id);
    },
  };
};
