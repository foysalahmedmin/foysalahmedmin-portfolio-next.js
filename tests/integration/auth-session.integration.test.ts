import type AuthSessionModel from "@/app/api/auth/session.model";
import type * as SessionRepositoryModule from "@/app/api/auth/session.repository";
import { ENV } from "@/config";
import { hashRefreshToken } from "@/lib/auth/session-security";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertReplicaSetTestDatabaseUrl,
  assertSafeTestDatabaseName,
  assertSafeTestDatabaseUrl,
} from "../helpers/test-database";

const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI?.trim();

describe.skipIf(!TEST_MONGODB_URI)("stateful auth session rotation", () => {
  let AuthSession: typeof AuthSessionModel;
  let SessionRepository: typeof SessionRepositoryModule;

  beforeAll(async () => {
    const databaseUri = assertReplicaSetTestDatabaseUrl(
      assertSafeTestDatabaseUrl(TEST_MONGODB_URI as string)
    );
    ENV.database_url = databaseUri;
    process.env.DATABASE_URL = databaseUri;
    const connectDB = (await import("@/lib/db")).default;
    await connectDB();
    assertSafeTestDatabaseName(mongoose.connection.name);
    [{ default: AuthSession }, SessionRepository] = await Promise.all([
      import("@/app/api/auth/session.model"),
      import("@/app/api/auth/session.repository"),
    ]);
    await AuthSession.syncIndexes();
  }, 60_000);

  beforeEach(async () => {
    assertSafeTestDatabaseName(mongoose.connection.name);
    await mongoose.connection.collection("auth_sessions").deleteMany({});
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  it("atomically rotates once and lets reuse revoke the family", async () => {
    const now = new Date();
    const currentHash = hashRefreshToken("current-token");
    await SessionRepository.create({
      sid: "550e8400-e29b-41d4-a716-446655440000",
      family_id: "b4c98620-9b72-4f1e-9f91-5d453b88633a",
      user: new mongoose.Types.ObjectId().toString(),
      refresh_token_hash: currentHash,
      user_state_hash: "state",
      role_snapshot: "admin",
      rotation_count: 0,
      last_used_at: now,
      expires_at: new Date(now.getTime() + 60_000),
    });

    const first = await SessionRepository.rotate({
      sid: "550e8400-e29b-41d4-a716-446655440000",
      family_id: "b4c98620-9b72-4f1e-9f91-5d453b88633a",
      current_hash: currentHash,
      current_rotation: 0,
      next_hash: hashRefreshToken("next-token"),
      next_rotation: 1,
      next_expiry: new Date(now.getTime() + 120_000),
      now,
    });
    const concurrentOldToken = await SessionRepository.rotate({
      sid: "550e8400-e29b-41d4-a716-446655440000",
      family_id: "b4c98620-9b72-4f1e-9f91-5d453b88633a",
      current_hash: currentHash,
      current_rotation: 0,
      next_hash: hashRefreshToken("other-token"),
      next_rotation: 1,
      next_expiry: new Date(now.getTime() + 120_000),
      now,
    });
    expect(first?.rotation_count).toBe(1);
    expect(concurrentOldToken).toBeNull();

    await SessionRepository.revokeFamily(
      "b4c98620-9b72-4f1e-9f91-5d453b88633a",
      "refresh-reuse-detected"
    );
    const stored = await AuthSession.findOne({}).lean();
    expect(stored).toMatchObject({
      rotation_count: 1,
      revocation_reason: "refresh-reuse-detected",
    });
    expect(stored?.revoked_at).toBeInstanceOf(Date);
  });
});
