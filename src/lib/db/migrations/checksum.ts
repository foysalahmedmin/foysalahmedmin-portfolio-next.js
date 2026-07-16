import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { MigrationError } from "./errors.ts";
import type { MigrationDefinition } from "./types.ts";

export type MigrationSourceReader = (
  migration: MigrationDefinition
) => Promise<Uint8Array | string>;

export function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createFilesystemMigrationSourceReader(sourceRoot: string) {
  const absoluteRoot = resolve(sourceRoot);

  return async (migration: MigrationDefinition) => {
    if (isAbsolute(migration.source_path)) {
      throw new MigrationError(
        "MIGRATION_SOURCE_PATH_INVALID",
        `Migration ${migration.id} must use a repository-relative source path.`
      );
    }

    const absoluteSource = resolve(absoluteRoot, migration.source_path);
    const relativeSource = relative(absoluteRoot, absoluteSource);

    if (
      relativeSource === "" ||
      relativeSource.startsWith("..") ||
      isAbsolute(relativeSource)
    ) {
      throw new MigrationError(
        "MIGRATION_SOURCE_PATH_INVALID",
        `Migration ${migration.id} source path escapes the repository root.`
      );
    }

    try {
      return await readFile(absoluteSource);
    } catch {
      throw new MigrationError(
        "MIGRATION_SOURCE_UNREADABLE",
        `Migration source for ${migration.id} could not be read.`
      );
    }
  };
}

export async function calculateMigrationChecksums(
  migrations: readonly MigrationDefinition[],
  readSource: MigrationSourceReader
) {
  const entries = await Promise.all(
    migrations.map(async (migration) => {
      const source = await readSource(migration);
      return [migration.id, sha256(source)] as const;
    })
  );

  return new Map(entries);
}
