import type { Db, Document } from "mongodb";

export const MIGRATION_STATUSES = ["running", "applied", "failed"] as const;

export type MigrationStatus = (typeof MIGRATION_STATUSES)[number];
export type MigrationMode = "dry-run" | "apply";

export type MigrationSummary = Record<string, unknown>;

export type MigrationBehavior = Readonly<{
  transaction: "none" | "optional" | "required";
  creates_indexes: boolean;
  destructive: boolean;
  resumable: boolean;
}>;

export type BackupConfirmation = Readonly<{
  reference_fingerprint: string;
  verified_at: Date;
}>;

export type DestructiveMigrationOptions = Readonly<{
  backup: BackupConfirmation | null;
  allow_index_replacement_gap: boolean;
  writes_quiesced: boolean;
}>;

export type MigrationCheckpoint = Document | null;

export type MigrationContext = Readonly<{
  db: Db;
  mode: MigrationMode;
  release: string;
  migration_id: string;
  checksum: string;
  checkpoint: MigrationCheckpoint;
  destructive: DestructiveMigrationOptions;
  now: () => Date;
  assert_lease: () => Promise<void>;
  save_checkpoint: (checkpoint: Document) => Promise<void>;
}>;

export type MigrationDefinition = Readonly<{
  id: string;
  description: string;
  source_path: string;
  behavior: MigrationBehavior;
  dry_run: (context: MigrationContext) => Promise<MigrationSummary>;
  up: (context: MigrationContext) => Promise<MigrationSummary>;
}>;

export type MigrationRecord = {
  _id: string;
  checksum: string;
  description: string;
  status: MigrationStatus;
  release: string;
  attempts: number;
  runner_owner: string | null;
  checkpoint: MigrationCheckpoint;
  summary: MigrationSummary | null;
  created_at: Date;
  started_at: Date;
  updated_at: Date;
  finished_at: Date | null;
  duration_ms: number | null;
};

export type MigrationRunItem = Readonly<{
  id: string;
  checksum: string;
  status: "pending" | "skipped" | "dry-run" | "applied";
  summary?: MigrationSummary;
}>;

export type MigrationRunReport = Readonly<{
  mode: MigrationMode;
  release: string;
  migrations: readonly MigrationRunItem[];
}>;
