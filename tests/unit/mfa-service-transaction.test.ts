import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const session = {
    withTransaction: vi.fn(),
    endSession: vi.fn(),
  };
  return {
    session,
    connectDB: vi.fn(),
    startSession: vi.fn(),
    appendAuditEvent: vi.fn(),
    enforceMfaUserRateLimit: vi.fn(),
    createAuthSession: vi.fn(),
    revokeUserSessions: vi.fn(),
    getUserStateHash: vi.fn(),
    hasCredential: vi.fn(),
    invalidateActiveChallenges: vi.fn(),
    createChallenge: vi.fn(),
    registerChallengeAttempt: vi.fn(),
    findChallengeForAudit: vi.fn(),
    consumeChallenge: vi.fn(),
    createCredential: vi.fn(),
    findCredentialWithSecrets: vi.fn(),
    consumeTotpCounter: vi.fn(),
    consumeRecoveryCodeHash: vi.fn(),
    incrementUserMfaVersion: vi.fn(),
    findEligibleUser: vi.fn(),
    findMatchingTotpCounter: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/audit-events/audit-event.service", () => ({
  appendAuditEvent: mocks.appendAuditEvent,
}));
vi.mock("@/lib/auth/auth-request-security", () => ({
  enforceMfaUserRateLimit: mocks.enforceMfaUserRateLimit,
}));
vi.mock("@/lib/auth/session-manager", () => ({
  createAuthSession: mocks.createAuthSession,
  revokeUserSessions: mocks.revokeUserSessions,
}));
vi.mock("@/lib/auth/session-security", () => ({
  getUserStateHash: mocks.getUserStateHash,
}));
vi.mock("@/app/api/auth/mfa.repository", () => ({
  hasCredential: mocks.hasCredential,
  invalidateActiveChallenges: mocks.invalidateActiveChallenges,
  createChallenge: mocks.createChallenge,
  registerChallengeAttempt: mocks.registerChallengeAttempt,
  findChallengeForAudit: mocks.findChallengeForAudit,
  consumeChallenge: mocks.consumeChallenge,
  createCredential: mocks.createCredential,
  findCredentialWithSecrets: mocks.findCredentialWithSecrets,
  consumeTotpCounter: mocks.consumeTotpCounter,
  consumeRecoveryCodeHash: mocks.consumeRecoveryCodeHash,
  incrementUserMfaVersion: mocks.incrementUserMfaVersion,
  findEligibleUser: mocks.findEligibleUser,
}));
vi.mock("@/lib/auth/mfa-security", () => ({
  createMfaChallengeToken: () => "t".repeat(43),
  decryptMfaValue: () => "TOTPSECRET",
  encryptMfaValue: (value: string) => `encrypted:${value}`,
  findMatchingTotpCounter: mocks.findMatchingTotpCounter,
  generateRecoveryCodes: () => ["AAAAAAAA-AAAAAAAA", "BBBBBBBB-BBBBBBBB"],
  generateTotpSecret: () => "TOTPSECRET",
  hashMfaChallengeToken: (value: string) => `hash:${value}`,
  hashRecoveryCode: (value: string) => `recovery:${value}`,
  normalizeRecoveryCode: (value: string) =>
    value.replaceAll("-", "").toUpperCase(),
  MFA_CHALLENGE_MAX_ATTEMPTS: 5,
  MFA_CHALLENGE_TTL_SECONDS: 300,
}));

import {
  completeEnrollment,
  startMfaChallenge,
  verifyChallenge,
} from "@/app/api/auth/mfa.service";

const objectId = (value: string) => ({ toString: () => value });
const userId = "507f1f77bcf86cd799439011";
const now = new Date("2026-07-17T12:00:00.000Z");
const user = {
  _id: objectId(userId),
  name: "Admin",
  email: "admin@example.test",
  role: "admin" as const,
  status: "in-progress" as const,
  is_verified: true,
  is_deleted: false,
  mfa_version: 0,
  password_changed_at: new Date("2026-07-01T00:00:00.000Z"),
};
const enrolledUser = { ...user, mfa_version: 1 };
const challenge = {
  _id: objectId("507f1f77bcf86cd799439012"),
  user: objectId(userId),
  purpose: "enroll" as const,
  token_hash: "stored-hash",
  user_state_hash: "state-v0",
  pending_secret_encrypted: "encrypted-secret",
  attempts: 1,
  max_attempts: 5,
  expires_at: new Date("2026-07-17T12:05:00.000Z"),
  consumed_at: null,
};
const credential = {
  _id: objectId("507f1f77bcf86cd799439013"),
  encrypted_secret: "encrypted-secret",
  recovery_code_hashes: ["stored-recovery-hash"],
  last_used_counter: 100,
};
const tokens = {
  access_token: "access",
  refresh_token: "refresh",
  access_expires_at: new Date("2026-07-17T12:15:00.000Z"),
  refresh_expires_at: new Date("2026-07-24T12:00:00.000Z"),
  principal: {
    _id: userId,
    name: "Admin",
    email: "admin@example.test",
    role: "admin" as const,
    is_verified: true,
    session_id: "session",
    access_expires_at: new Date("2026-07-17T12:15:00.000Z"),
  },
};

describe("MFA completion transaction boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startSession.mockResolvedValue(mocks.session);
    mocks.connectDB.mockResolvedValue({ startSession: mocks.startSession });
    mocks.session.withTransaction.mockImplementation(
      async (operation: () => Promise<void>) => await operation()
    );
    mocks.session.endSession.mockResolvedValue(undefined);
    mocks.appendAuditEvent.mockResolvedValue({});
    mocks.enforceMfaUserRateLimit.mockResolvedValue(undefined);
    mocks.getUserStateHash.mockReturnValue("state-v0");
    mocks.hasCredential.mockResolvedValue(false);
    mocks.registerChallengeAttempt.mockResolvedValue(challenge);
    mocks.findChallengeForAudit.mockResolvedValue(null);
    mocks.consumeChallenge.mockResolvedValue(true);
    mocks.createCredential.mockResolvedValue(credential);
    mocks.findCredentialWithSecrets.mockResolvedValue(credential);
    mocks.consumeTotpCounter.mockResolvedValue(true);
    mocks.consumeRecoveryCodeHash.mockResolvedValue(true);
    mocks.incrementUserMfaVersion.mockResolvedValue(enrolledUser);
    mocks.findEligibleUser.mockResolvedValue(user);
    mocks.findMatchingTotpCounter.mockReturnValue(101);
    mocks.createAuthSession.mockResolvedValue(tokens);
    mocks.revokeUserSessions.mockResolvedValue(2);
  });

  it("binds a new challenge to the current user security state", async () => {
    await startMfaChallenge(user as never, now);

    expect(mocks.createChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        user: userId,
        user_state_hash: "state-v0",
      })
    );
  });

  it("atomically enrolls credential, counter, user state, challenge, sessions, and audit", async () => {
    const result = await completeEnrollment("c".repeat(43), "123456", now);

    expect(result.tokens).toBe(tokens);
    expect(mocks.enforceMfaUserRateLimit).toHaveBeenCalledWith(userId);
    expect(mocks.session.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.createCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        user: userId,
        recovery_code_hashes: expect.any(Array),
      }),
      mocks.session
    );
    expect(mocks.consumeTotpCounter).toHaveBeenCalledWith(
      credential._id.toString(),
      101,
      mocks.session
    );
    expect(mocks.incrementUserMfaVersion).toHaveBeenCalledWith(
      userId,
      user,
      mocks.session
    );
    expect(mocks.consumeChallenge).toHaveBeenCalledWith(
      challenge._id.toString(),
      now,
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
        action: "auth.mfa.enrolled",
      }),
      { session: mocks.session, now }
    );
    expect(mocks.createAuthSession).toHaveBeenCalledWith(
      enrolledUser,
      expect.objectContaining({ session: mocks.session, now })
    );
    expect(mocks.session.endSession).toHaveBeenCalledOnce();
  });

  it("atomically consumes a recovery code and creates the verified session", async () => {
    mocks.registerChallengeAttempt.mockResolvedValue({
      ...challenge,
      purpose: "verify",
      pending_secret_encrypted: null,
    });

    await verifyChallenge(
      "v".repeat(43),
      { recovery_code: "AAAAAAAA-AAAAAAAA" },
      now
    );

    expect(mocks.consumeRecoveryCodeHash).toHaveBeenCalledWith(
      credential._id.toString(),
      "recovery:AAAAAAAAAAAAAAAA",
      mocks.session
    );
    expect(mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "auth.mfa.recovery_used" }),
      { session: mocks.session, now }
    );
    expect(mocks.createAuthSession).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ session: mocks.session, now })
    );
  });

  it("rejects a challenge after password, role, status, or MFA state changes", async () => {
    mocks.getUserStateHash.mockReturnValue("state-after-password-change");

    await expect(
      verifyChallenge("v".repeat(43), { code: "123456" }, now)
    ).rejects.toMatchObject({ status: 401 });

    expect(mocks.consumeTotpCounter).not.toHaveBeenCalled();
    expect(mocks.createAuthSession).not.toHaveBeenCalled();
    expect(mocks.appendAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "auth.mfa.failed",
        outcome: "denied",
        reason_code: "challenge_state_changed",
      }),
      { now }
    );
  });

  it("audits exhausted attempts without challenge or factor material", async () => {
    const exhausted = { ...challenge, attempts: 5 };
    mocks.registerChallengeAttempt.mockResolvedValue(null);
    mocks.findChallengeForAudit.mockResolvedValue(exhausted);

    await expect(
      verifyChallenge("x".repeat(43), { code: "000000" }, now)
    ).rejects.toMatchObject({ status: 401 });

    const auditInput = mocks.appendAuditEvent.mock.calls[0]?.[0];
    expect(auditInput).toEqual(
      expect.objectContaining({
        action: "auth.mfa.failed",
        reason_code: "attempts_exhausted",
      })
    );
    expect(JSON.stringify(auditInput)).not.toContain("x".repeat(43));
    expect(JSON.stringify(auditInput)).not.toContain("000000");
  });

  it("audits a rejected factor without recording the presented code", async () => {
    mocks.findMatchingTotpCounter.mockReturnValue(null);

    await expect(
      completeEnrollment("c".repeat(43), "000000", now)
    ).rejects.toMatchObject({ status: 401 });

    const auditInput = mocks.appendAuditEvent.mock.calls[0]?.[0];
    expect(auditInput).toEqual(
      expect.objectContaining({
        action: "auth.mfa.failed",
        reason_code: "factor_rejected",
        metadata: expect.objectContaining({ security_signal: "totp" }),
      })
    );
    expect(JSON.stringify(auditInput)).not.toContain("000000");
    expect(mocks.session.withTransaction).not.toHaveBeenCalled();
  });

  it("does not create a session when an in-transaction audit write fails", async () => {
    mocks.appendAuditEvent.mockRejectedValueOnce(
      new Error("audit unavailable")
    );

    await expect(
      completeEnrollment("c".repeat(43), "123456", now)
    ).rejects.toThrow("audit unavailable");

    expect(mocks.session.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.createAuthSession).not.toHaveBeenCalled();
    expect(mocks.session.endSession).toHaveBeenCalledOnce();
  });
});
