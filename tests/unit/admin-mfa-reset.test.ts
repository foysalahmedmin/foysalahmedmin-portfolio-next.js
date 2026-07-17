import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const session = {
    withTransaction: vi.fn(),
    endSession: vi.fn(),
  };
  return {
    session,
    rolledBack: false,
    connectDB: vi.fn(),
    startSession: vi.fn(),
    findResetEligibleUserByEmail: vi.fn(),
    deleteCredentialForUser: vi.fn(),
    invalidateActiveChallenges: vi.fn(),
    incrementUserMfaVersion: vi.fn(),
    revokeUserSessions: vi.fn(),
    appendAuditEvent: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/auth/mfa.repository", () => ({
  findResetEligibleUserByEmail: mocks.findResetEligibleUserByEmail,
  deleteCredentialForUser: mocks.deleteCredentialForUser,
  invalidateActiveChallenges: mocks.invalidateActiveChallenges,
  incrementUserMfaVersion: mocks.incrementUserMfaVersion,
}));
vi.mock("@/lib/auth/session-manager", () => ({
  revokeUserSessions: mocks.revokeUserSessions,
}));
vi.mock("@/app/api/audit-events/audit-event.service", () => ({
  appendAuditEvent: mocks.appendAuditEvent,
}));

import {
  getAdminMfaResetConfirmation,
  parseAdminMfaResetArgs,
  resetAdminMfa,
} from "@/lib/auth/admin-mfa-reset";

const userId = "507f1f77bcf86cd799439011";
const email = "admin@example.test";
const now = new Date("2026-07-17T12:00:00.000Z");
const user = {
  _id: { toString: () => userId },
  email,
  role: "admin" as const,
  status: "in-progress" as const,
  is_deleted: false,
  mfa_version: 4,
  password_changed_at: new Date("2026-07-01T00:00:00.000Z"),
};

describe("guarded operator MFA reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rolledBack = false;
    mocks.startSession.mockResolvedValue(mocks.session);
    mocks.connectDB.mockResolvedValue({ startSession: mocks.startSession });
    mocks.session.withTransaction.mockImplementation(
      async (operation: () => Promise<void>) => {
        try {
          await operation();
        } catch (error) {
          mocks.rolledBack = true;
          throw error;
        }
      }
    );
    mocks.session.endSession.mockResolvedValue(undefined);
    mocks.findResetEligibleUserByEmail.mockResolvedValue(user);
    mocks.deleteCredentialForUser.mockResolvedValue(true);
    mocks.invalidateActiveChallenges.mockResolvedValue(undefined);
    mocks.incrementUserMfaVersion.mockResolvedValue({
      ...user,
      mfa_version: 5,
    });
    mocks.revokeUserSessions.mockResolvedValue(2);
    mocks.appendAuditEvent.mockResolvedValue({});
  });

  it("requires a normalized named target and exact target confirmation", () => {
    expect(
      parseAdminMfaResetArgs([
        "--email=ADMIN@example.test",
        "--confirm=RESET_MFA_FOR:admin@example.test",
      ])
    ).toEqual({
      email,
      confirmation: "RESET_MFA_FOR:admin@example.test",
    });
    expect(() =>
      parseAdminMfaResetArgs([
        `--email=${email}`,
        "--confirm=RESET_MFA_FOR:other@example.test",
      ])
    ).toThrow(/confirmation/i);
    expect(getAdminMfaResetConfirmation(email)).toBe(
      "RESET_MFA_FOR:admin@example.test"
    );
  });

  it("resets only the eligible named admin in one audited transaction", async () => {
    const result = await resetAdminMfa(
      {
        email,
        confirmation: getAdminMfaResetConfirmation(email),
      },
      now
    );

    expect(result).toEqual({ reset: true, user_id: userId, email });
    expect(mocks.findResetEligibleUserByEmail).toHaveBeenCalledWith(
      email,
      mocks.session
    );
    expect(mocks.deleteCredentialForUser).toHaveBeenCalledWith(
      userId,
      mocks.session
    );
    expect(mocks.invalidateActiveChallenges).toHaveBeenCalledWith(
      userId,
      now,
      mocks.session
    );
    expect(mocks.incrementUserMfaVersion).toHaveBeenCalledWith(
      userId,
      user,
      mocks.session
    );
    expect(mocks.revokeUserSessions).toHaveBeenCalledWith(
      userId,
      "user-state-changed",
      mocks.session,
      now
    );
    expect(mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.mfa.reset",
        actor: { type: "system" },
        target: { type: "user", id: userId },
        reason_code: "operator_break_glass",
      }),
      { session: mocks.session, now }
    );
    expect(
      JSON.stringify(mocks.appendAuditEvent.mock.calls[0]?.[0])
    ).not.toContain(email);
    expect(mocks.session.endSession).toHaveBeenCalledOnce();
  });

  it("refuses a non-admin before deleting any credential", async () => {
    mocks.findResetEligibleUserByEmail.mockResolvedValue({
      ...user,
      role: "user",
    });

    await expect(
      resetAdminMfa({
        email,
        confirmation: getAdminMfaResetConfirmation(email),
      })
    ).rejects.toThrow(/not eligible/i);

    expect(mocks.deleteCredentialForUser).not.toHaveBeenCalled();
    expect(mocks.appendAuditEvent).not.toHaveBeenCalled();
  });

  it("propagates an audit failure so the transaction rolls back", async () => {
    mocks.appendAuditEvent.mockRejectedValue(new Error("audit unavailable"));

    await expect(
      resetAdminMfa({
        email,
        confirmation: getAdminMfaResetConfirmation(email),
      })
    ).rejects.toThrow("audit unavailable");

    expect(mocks.rolledBack).toBe(true);
    expect(mocks.session.endSession).toHaveBeenCalledOnce();
  });
});
