import connectDB from "@/lib/db";
import type {
  SeedFileReference,
  SeedMediaGateway,
  SeedMediaPlan,
  SeedMediaRequest,
} from "@/lib/seed/types";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { ObjectId, type Db } from "mongodb";
import * as FileRepository from "./file.repository";
import {
  createManagedFiles,
  deleteFile,
  deleteFilePermanent,
} from "./file.service";
import type { TFilePurpose } from "./file.type";
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

const storedIdempotencyKey = (rawKey: string): string =>
  `v1:${createHash("sha256").update(`${rawKey}\0${0}`).digest("hex")}`;

const loadPreparedSeedMedia = async (input: {
  request: SeedMediaRequest;
  asset_root: string;
}) => {
  if (input.request.source.kind !== "repository_file") {
    throw new Error("Pending media has no ingestible repository source");
  }
  const source = input.request.source;
  const root = await realpath(path.resolve(input.asset_root));
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
  actor: TJwtPayload;
  asset_root: string;
  db: Db;
}): SeedMediaGateway => {
  const prepare = async (request: SeedMediaRequest) => {
    await connectDB();
    return loadPreparedSeedMedia({ request, asset_root: input.asset_root });
  };

  const findExisting = async (
    request: SeedMediaRequest,
    prepared: Awaited<ReturnType<typeof loadPreparedSeedMedia>>["prepared"]
  ) => {
    const existing = await FileRepository.findReadyDuplicate({
      author: input.actor._id,
      checksum: prepared.checksum,
      purpose: prepared.purpose,
      access: prepared.access,
    });
    if (existing?.source && existing.source !== request.metadata.source) {
      throw new Error(
        "Matching managed media has a different source classification"
      );
    }
    return existing;
  };

  return {
    inspect: async (request): Promise<SeedMediaPlan> => {
      const { prepared, sourceChecksum } = await prepare(request);
      const existing = await findExisting(request, prepared);
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
      const existing = await findExisting(request, prepared);
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
        author: input.actor._id,
        idempotency_key: storedIdempotencyKey(rawIdempotencyKey),
      });
      if (priorIdempotent?._id) {
        return {
          media_key: request.media_key,
          action: "existing",
          file_id: priorIdempotent._id.toString(),
          created_by_run: false,
          source_sha256: sourceChecksum,
        };
      }

      const [createdOrReused] = await createManagedFiles(
        input.actor,
        [{ ...prepared, field_name: "seed_file", storage: {} }],
        {
          name: request.metadata.name,
          purpose: prepared.purpose,
          source: request.metadata.source,
          alt_text: request.metadata.alt_text,
          is_decorative: request.metadata.is_decorative,
          idempotency_key: rawIdempotencyKey,
          ...(request.metadata.source === "generated"
            ? { provenance: { source_checksum: sourceChecksum } }
            : {}),
        }
      );
      if (!createdOrReused?._id) {
        throw new Error("Managed-media ingestion returned no File identity");
      }
      const idempotent = await FileRepository.findReadyByIdempotencyKey({
        author: input.actor._id,
        idempotency_key: storedIdempotencyKey(rawIdempotencyKey),
      });
      const createdByRun =
        idempotent?._id?.toString() === createdOrReused._id.toString();
      return {
        media_key: request.media_key,
        action: createdByRun ? "created" : "existing",
        file_id: createdOrReused._id.toString(),
        created_by_run: createdByRun,
        source_sha256: sourceChecksum,
      };
    },
    compensate: async (item): Promise<void> => {
      if (!item.created_by_run || !item.file_id) return;
      await deleteFile(input.actor, item.file_id);
      await deleteFilePermanent(item.file_id);
    },
    validateReferences: async (
      references: readonly SeedFileReference[],
      session
    ): Promise<void> => {
      for (const reference of references) {
        if (!ObjectId.isValid(reference.file_id)) {
          throw new Error("Seed File reference has an invalid identity");
        }
        const file = await input.db.collection("files").findOne(
          {
            _id: new ObjectId(reference.file_id),
            lifecycle_state: "ready",
            status: "active",
            is_deleted: { $ne: true },
            purpose: { $in: [...reference.purposes] },
          },
          { projection: { _id: 1 }, session }
        );
        if (!file) {
          throw new Error("Seed File reference is unavailable or incompatible");
        }
      }
    },
  };
};
