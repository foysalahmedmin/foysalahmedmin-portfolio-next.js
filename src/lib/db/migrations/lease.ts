import type { Collection } from "mongodb";
import {
  MigrationLeaseLostError,
  MigrationLeaseUnavailableError,
} from "./errors.ts";

type MigrationLeaseRecord = {
  _id: "schema-migrations";
  owner: string;
  acquired_at: Date;
  heartbeat_at: Date;
  expires_at: Date;
};

type MigrationLeaseOptions = Readonly<{
  collection: Collection<MigrationLeaseRecord>;
  owner: string;
  ttl_ms: number;
  now?: () => Date;
}>;

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export function getLeaseExpiry(now: Date, ttlMs: number) {
  return new Date(now.getTime() + ttlMs);
}

export class MongoMigrationLease {
  private readonly collection: Collection<MigrationLeaseRecord>;
  private readonly owner: string;
  private readonly ttlMs: number;
  private readonly now: () => Date;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatRunning = false;
  private lost = false;

  private constructor(options: MigrationLeaseOptions) {
    this.collection = options.collection;
    this.owner = options.owner;
    this.ttlMs = options.ttl_ms;
    this.now = options.now ?? (() => new Date());
  }

  static async acquire(options: MigrationLeaseOptions) {
    if (!Number.isFinite(options.ttl_ms) || options.ttl_ms < 5_000) {
      throw new Error("Migration lease TTL must be at least 5000ms.");
    }

    const lease = new MongoMigrationLease(options);
    const now = lease.now();

    try {
      const acquired = await lease.collection.findOneAndUpdate(
        {
          _id: "schema-migrations",
          $or: [
            { owner: lease.owner },
            { expires_at: { $lte: now } },
            { expires_at: { $exists: false } },
          ],
        },
        {
          $set: {
            owner: lease.owner,
            acquired_at: now,
            heartbeat_at: now,
            expires_at: getLeaseExpiry(now, lease.ttlMs),
          },
        },
        { upsert: true, returnDocument: "after" }
      );

      if (!acquired || acquired.owner !== lease.owner) {
        throw new MigrationLeaseUnavailableError();
      }
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new MigrationLeaseUnavailableError();
      }
      throw error;
    }

    return lease;
  }

  async heartbeat() {
    if (this.lost) throw new MigrationLeaseLostError();

    const now = this.now();
    const result = await this.collection.updateOne(
      {
        _id: "schema-migrations",
        owner: this.owner,
        expires_at: { $gt: now },
      },
      {
        $set: {
          heartbeat_at: now,
          expires_at: getLeaseExpiry(now, this.ttlMs),
        },
      }
    );

    if (result.matchedCount !== 1) {
      this.lost = true;
      throw new MigrationLeaseLostError();
    }
  }

  async assertOwned() {
    await this.heartbeat();
  }

  startHeartbeat() {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(
      () => {
        if (this.heartbeatRunning || this.lost) return;
        this.heartbeatRunning = true;

        void this.heartbeat()
          .catch(() => {
            this.lost = true;
          })
          .finally(() => {
            this.heartbeatRunning = false;
          });
      },
      Math.max(1_000, Math.floor(this.ttlMs / 3))
    );

    this.heartbeatTimer.unref?.();
  }

  stopHeartbeat() {
    if (!this.heartbeatTimer) return;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  async release() {
    this.stopHeartbeat();
    await this.collection.deleteOne({
      _id: "schema-migrations",
      owner: this.owner,
    });
  }
}
