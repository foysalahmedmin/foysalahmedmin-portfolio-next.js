import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isMfaSessionAccepted: vi.fn(),
  findBySid: vi.fn(),
  createSession: vi.fn(),
  revokeFamily: vi.fn(),
  revokeBySid: vi.fn(),
  touch: vi.fn(),
  rotate: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyAccessTokenStrict: vi.fn(),
  verifyRefreshTokenStrict: vi.fn(),
  getUserStateHash: vi.fn(),
  hashRefreshToken: vi.fn(),
  evaluateRefreshPresentation: vi.fn(),
  findById: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: vi.fn() }));
vi.mock("@/lib/db/soft-delete", () => ({
  setSoftDeleteScope: (query: unknown) => query,
}));
vi.mock("@/app/api/users/user.model", () => ({
  default: { findById: mocks.findById },
}));
vi.mock("@/app/api/auth/session.repository", () => ({
  findBySid: mocks.findBySid,
  create: mocks.createSession,
  revokeFamily: mocks.revokeFamily,
  revokeBySid: mocks.revokeBySid,
  touch: mocks.touch,
  rotate: mocks.rotate,
}));
vi.mock("@/lib/auth/mfa-policy", () => ({
  isMfaSessionAccepted: mocks.isMfaSessionAccepted,
}));
vi.mock("@/lib/auth/session-security", () => ({
  createSessionId: () => "session-id",
  createSessionFamilyId: () => "family-id",
  signAccessToken: mocks.signAccessToken,
  signRefreshToken: mocks.signRefreshToken,
  verifyAccessTokenStrict: mocks.verifyAccessTokenStrict,
  verifyRefreshTokenStrict: mocks.verifyRefreshTokenStrict,
  getUserStateHash: mocks.getUserStateHash,
  hashRefreshToken: mocks.hashRefreshToken,
  evaluateRefreshPresentation: mocks.evaluateRefreshPresentation,
}));

import {
  createAuthSession,
  rotateRefreshSession,
  verifyAccessSessionToken,
} from "@/lib/auth/session-manager";

const user = {
  _id: { toString: () => "507f1f77bcf86cd799439011" },
  name: "Admin",
  email: "admin@example.test",
  role: "admin" as const,
  status: "in-progress" as const,
  is_verified: true,
  is_deleted: false,
  mfa_version: 1,
  password_changed_at: new Date("2026-01-01T00:00:00.000Z"),
};

const session = {
  sid: "session-id",
  family_id: "family-id",
  user: { toString: () => "507f1f77bcf86cd799439011" },
  refresh_token_hash: "stored-hash",
  rotation_count: 0,
  user_state_hash: "state-hash",
  expires_at: new Date("2099-01-01T00:00:00.000Z"),
  revoked_at: null,
  mfa_verified_at: null,
};

describe("stateful session MFA enforcement", () => {
  beforeEach(() => {
    const query = {
      select: vi.fn(),
      lean: vi.fn().mockResolvedValue(user),
    };
    query.select.mockReturnValue(query);
    mocks.findById.mockReturnValue(query);
    mocks.findBySid.mockResolvedValue(session);
    mocks.isMfaSessionAccepted.mockReturnValue(false);
    mocks.getUserStateHash.mockReturnValue("state-hash");
    mocks.revokeFamily.mockResolvedValue(1);
    mocks.verifyAccessTokenStrict.mockReturnValue({
      _id: "507f1f77bcf86cd799439011",
      sid: "session-id",
      exp: Math.floor(Date.now() / 1_000) + 60,
    });
    mocks.verifyRefreshTokenStrict.mockReturnValue({
      _id: "507f1f77bcf86cd799439011",
      sid: "session-id",
      family_id: "family-id",
      rotation: 0,
    });
    mocks.hashRefreshToken.mockReturnValue("stored-hash");
    mocks.evaluateRefreshPresentation.mockReturnValue("valid");
  });

  it("cannot mint a privileged session without an MFA timestamp", async () => {
    await expect(createAuthSession(user)).rejects.toMatchObject({
      status: 401,
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(mocks.signAccessToken).not.toHaveBeenCalled();
    expect(mocks.signRefreshToken).not.toHaveBeenCalled();
  });

  it("revokes and rejects a legacy access session without MFA evidence", async () => {
    await expect(
      verifyAccessSessionToken("legacy-access-token")
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.revokeFamily).toHaveBeenCalledWith(
      "family-id",
      "user-state-changed",
      expect.any(Date)
    );
    expect(mocks.touch).not.toHaveBeenCalled();
  });

  it("revokes and rejects the same legacy session on refresh rotation", async () => {
    await expect(
      rotateRefreshSession("legacy-refresh-token")
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.revokeFamily).toHaveBeenCalledWith(
      "family-id",
      "user-state-changed",
      expect.any(Date)
    );
    expect(mocks.rotate).not.toHaveBeenCalled();
  });
});
