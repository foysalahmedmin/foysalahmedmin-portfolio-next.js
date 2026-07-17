import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const session = {
    withTransaction: vi.fn(),
    endSession: vi.fn(),
  };
  const resetQuery = { select: vi.fn() };
  return {
    session,
    resetQuery,
    connectDB: vi.fn(),
    startSession: vi.fn(),
    findByIdWithSecrets: vi.fn(),
    updateById: vi.fn(),
    updateEligiblePasswordById: vi.fn(),
    invalidateActiveChallenges: vi.fn(),
    revokeUserSessions: vi.fn(),
    compare: vi.fn(),
    hash: vi.fn(),
    passwordResetFindOneAndUpdate: vi.fn(),
    passwordResetUpdateOne: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/auth/auth.repository", () => ({
  findByEmail: vi.fn(),
  findByIdWithSecrets: mocks.findByIdWithSecrets,
  create: vi.fn(),
  updateById: mocks.updateById,
  updateEligiblePasswordById: mocks.updateEligiblePasswordById,
}));
vi.mock("@/app/api/auth/mfa.repository", () => ({
  invalidateActiveChallenges: mocks.invalidateActiveChallenges,
}));
vi.mock("@/lib/auth/session-manager", () => ({
  createAuthSession: vi.fn(),
  revokeUserSessions: mocks.revokeUserSessions,
  rotateRefreshSession: vi.fn(),
}));
vi.mock("@/app/api/auth/mfa.service", () => ({
  startMfaChallenge: vi.fn(),
}));
vi.mock("@/app/api/auth/password-reset.model", () => ({
  default: {
    findOneAndUpdate: mocks.passwordResetFindOneAndUpdate,
    updateOne: mocks.passwordResetUpdateOne,
    updateMany: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));
vi.mock("@/utils/send-email", () => ({ sendEmail: vi.fn() }));
vi.mock("bcrypt", () => ({
  default: {
    compare: mocks.compare,
    hash: mocks.hash,
  },
}));

import { changePassword, resetPassword } from "@/app/api/auth/auth.service";

const userId = "507f1f77bcf86cd799439011";
const user = {
  _id: { toString: () => userId },
  password: "stored-password-hash",
  role: "admin",
  status: "in-progress",
  is_deleted: false,
};

describe("password mutation MFA invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startSession.mockResolvedValue(mocks.session);
    mocks.connectDB.mockResolvedValue({ startSession: mocks.startSession });
    mocks.session.withTransaction.mockImplementation(
      async (operation: () => Promise<void>) => await operation()
    );
    mocks.session.endSession.mockResolvedValue(undefined);
    mocks.findByIdWithSecrets.mockResolvedValue(user);
    mocks.updateById.mockResolvedValue(user);
    mocks.updateEligiblePasswordById.mockResolvedValue(user);
    mocks.invalidateActiveChallenges.mockResolvedValue(undefined);
    mocks.revokeUserSessions.mockResolvedValue(3);
    mocks.compare.mockResolvedValue(true);
    mocks.hash.mockResolvedValue("new-password-hash");
    mocks.passwordResetUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("invalidates pending challenges in the password-change transaction", async () => {
    await changePassword({ _id: userId } as never, {
      current_password: "CurrentPassword1",
      new_password: "NewPassword123",
    });

    expect(mocks.invalidateActiveChallenges).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
      mocks.session
    );
    expect(mocks.revokeUserSessions).toHaveBeenCalledWith(
      userId,
      "password-changed",
      mocks.session,
      expect.any(Date)
    );
  });

  it("invalidates pending challenges in the password-reset transaction", async () => {
    const reset = {
      _id: { toString: () => "507f1f77bcf86cd799439012" },
      user: { toString: () => userId },
    };
    mocks.resetQuery.select.mockResolvedValue(reset);
    mocks.passwordResetFindOneAndUpdate.mockReturnValue(mocks.resetQuery);

    await resetPassword({
      token: "r".repeat(43),
      password: "NewPassword123",
    });

    expect(mocks.invalidateActiveChallenges).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
      mocks.session
    );
    expect(mocks.revokeUserSessions).toHaveBeenCalledWith(
      userId,
      "password-changed",
      mocks.session,
      expect.any(Date)
    );
    expect(mocks.passwordResetUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: reset._id, status: "processing" }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: "used" }),
      }),
      { session: mocks.session }
    );
  });
});
