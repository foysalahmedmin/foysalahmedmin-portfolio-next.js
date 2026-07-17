import { appendAuditEvent } from "@/app/api/audit-events/audit-event.service";
import type { TUserDocument } from "@/app/api/users/user.type";
import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import { enforceMfaUserRateLimit } from "@/lib/auth/auth-request-security";
import {
  createAuthSession,
  revokeUserSessions,
  type AuthTokenPair,
} from "@/lib/auth/session-manager";
import { getUserStateHash } from "@/lib/auth/session-security";
import connectDB from "@/lib/db";
import httpStatus from "http-status";
import type { ClientSession } from "mongoose";
import {
  createMfaChallengeToken,
  decryptMfaValue,
  encryptMfaValue,
  findMatchingTotpCounter,
  generateRecoveryCodes,
  generateTotpSecret,
  hashMfaChallengeToken,
  hashRecoveryCode,
  MFA_CHALLENGE_MAX_ATTEMPTS,
  MFA_CHALLENGE_TTL_SECONDS,
  normalizeRecoveryCode,
} from "@/lib/auth/mfa-security";
import * as MfaRepository from "./mfa.repository";

const INVALID_MFA_CODE =
  "The verification code is invalid or the challenge has expired.";

export type MfaChallengeStage = "enroll" | "verify";

export type MfaChallengePrompt = Readonly<{
  required: true;
  stage: MfaChallengeStage;
  expires_at: string;
  issuer?: string;
  account_name?: string;
  manual_secret?: string;
}>;

export type MfaChallengeStart = Readonly<{
  kind: "mfa-challenge";
  challenge_token: string;
  expires_at: Date;
  prompt: MfaChallengePrompt;
}>;

export type MfaCompletion = Readonly<{
  tokens: AuthTokenPair;
  recovery_codes?: readonly string[];
}>;

type MfaFailureReason =
  | "attempts_exhausted"
  | "challenge_consumed"
  | "challenge_expired"
  | "challenge_rejected"
  | "challenge_state_changed"
  | "factor_rejected"
  | "rate_limited";

type MfaSecuritySignal = "challenge" | "recovery-code" | "totp";

class MfaFlowError extends Error {
  readonly reason: MfaFailureReason;
  readonly securitySignal: MfaSecuritySignal;

  constructor(reason: MfaFailureReason, securitySignal: MfaSecuritySignal) {
    super("mfa_flow_rejected");
    this.name = "MfaFlowError";
    this.reason = reason;
    this.securitySignal = securitySignal;
  }
}

const invalidMfa = (): AppError =>
  new AppError(httpStatus.UNAUTHORIZED, INVALID_MFA_CODE);

const rejectFlow = (
  reason: MfaFailureReason,
  securitySignal: MfaSecuritySignal
): never => {
  throw new MfaFlowError(reason, securitySignal);
};

const getIssuer = (): string => {
  const configured =
    ENV.auth_mfa_issuer?.trim() || "Foysal Ahmed Min Portfolio";
  const safe = configured.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 64);
  return safe || "Foysal Ahmed Min Portfolio";
};

const appendMfaSuccessAudit = async (
  action: "auth.mfa.enrolled" | "auth.mfa.verified" | "auth.mfa.recovery_used",
  user: TUserDocument,
  options: { session: ClientSession; now: Date }
): Promise<void> => {
  await appendAuditEvent(
    {
      action,
      actor: {
        type: "user",
        id: user._id.toString(),
        role: user.role,
      },
      target: { type: "user", id: user._id.toString() },
      source: "api",
      summary_code: action.replaceAll(".", "_"),
      changed_fields: action === "auth.mfa.enrolled" ? ["mfa"] : [],
      metadata: {
        request_channel: "browser",
        security_signal:
          action === "auth.mfa.recovery_used" ? "recovery-code" : "totp",
        transactional: true,
      },
    },
    options
  );
};

const appendMfaFailureAudit = async (
  userId: string,
  reason: MfaFailureReason,
  securitySignal: MfaSecuritySignal,
  now: Date
): Promise<void> => {
  await appendAuditEvent(
    {
      action: "auth.mfa.failed",
      actor: { type: "system" },
      target: { type: "user", id: userId },
      outcome: "denied",
      source: "api",
      summary_code: "auth_mfa_failed",
      reason_code: reason,
      metadata: {
        request_channel: "browser",
        security_signal: securitySignal,
      },
    },
    { now }
  );
};

const challengeFailureReason = (
  challenge: Awaited<ReturnType<typeof MfaRepository.findChallengeForAudit>>,
  now: Date
): MfaFailureReason => {
  if (!challenge) return "challenge_rejected";
  if (challenge.attempts >= challenge.max_attempts) {
    return "attempts_exhausted";
  }
  if (challenge.consumed_at) return "challenge_consumed";
  if (challenge.expires_at.getTime() <= now.getTime()) {
    return "challenge_expired";
  }
  return "challenge_rejected";
};

const auditFlowRejection = async (
  userId: string,
  error: MfaFlowError,
  now: Date
): Promise<never> => {
  await appendMfaFailureAudit(userId, error.reason, error.securitySignal, now);
  throw invalidMfa();
};

const enforceKnownChallengeRateLimit = async (
  userId: string,
  now: Date
): Promise<void> => {
  try {
    await enforceMfaUserRateLimit(userId);
  } catch (error) {
    await appendMfaFailureAudit(userId, "rate_limited", "challenge", now);
    throw error;
  }
};

const runCompletionTransaction = async <T>(
  operation: (session: ClientSession) => Promise<T>
): Promise<T> => {
  const db = await connectDB();
  const session = await db.startSession();
  let result: T | undefined;
  try {
    await session.withTransaction(async () => {
      result = await operation(session);
    });
  } finally {
    await session.endSession();
  }
  if (result === undefined) {
    throw new Error("MFA transaction completed without a result.");
  }
  return result;
};

export const startMfaChallenge = async (
  user: TUserDocument,
  now = new Date()
): Promise<MfaChallengeStart> => {
  await connectDB();
  const userId = user._id.toString();
  const enrolled = await MfaRepository.hasCredential(userId);
  const purpose = enrolled ? "verify" : "enroll";
  const challengeToken = createMfaChallengeToken();
  const expiresAt = new Date(now.getTime() + MFA_CHALLENGE_TTL_SECONDS * 1_000);
  const secret = enrolled ? undefined : generateTotpSecret();

  await MfaRepository.invalidateActiveChallenges(userId, now);
  await MfaRepository.createChallenge({
    user: userId,
    purpose,
    token_hash: hashMfaChallengeToken(challengeToken),
    user_state_hash: getUserStateHash(user),
    pending_secret_encrypted: secret ? encryptMfaValue(secret) : null,
    expires_at: expiresAt,
    max_attempts: MFA_CHALLENGE_MAX_ATTEMPTS,
  });

  const issuer = getIssuer();
  return {
    kind: "mfa-challenge",
    challenge_token: challengeToken,
    expires_at: expiresAt,
    prompt: {
      required: true,
      stage: purpose,
      expires_at: expiresAt.toISOString(),
      ...(secret
        ? {
            issuer,
            account_name: user.email,
            manual_secret: secret,
          }
        : {}),
    },
  };
};

const registerAttempt = async (
  challengeToken: string,
  purpose: "enroll" | "verify",
  now: Date
) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(challengeToken)) throw invalidMfa();
  const tokenHash = hashMfaChallengeToken(challengeToken);
  const challenge = await MfaRepository.registerChallengeAttempt(
    tokenHash,
    purpose,
    now
  );
  if (challenge) return challenge;

  const known = await MfaRepository.findChallengeForAudit(tokenHash, purpose);
  if (known) {
    await appendMfaFailureAudit(
      known.user.toString(),
      challengeFailureReason(known, now),
      "challenge",
      now
    );
  }
  throw invalidMfa();
};

const assertChallengeUserState = (
  challengeStateHash: string,
  user: TUserDocument | null
): TUserDocument => {
  if (!user) {
    throw new MfaFlowError("challenge_state_changed", "challenge");
  }
  if (
    user.is_deleted ||
    user.status === "blocked" ||
    getUserStateHash(user) !== challengeStateHash
  ) {
    throw new MfaFlowError("challenge_state_changed", "challenge");
  }
  return user;
};

export const completeEnrollment = async (
  challengeToken: string,
  code: string,
  now = new Date()
): Promise<MfaCompletion> => {
  await connectDB();
  const challenge = await registerAttempt(challengeToken, "enroll", now);
  const userId = challenge.user.toString();
  await enforceKnownChallengeRateLimit(userId, now);
  if (!challenge.pending_secret_encrypted) {
    return await auditFlowRejection(
      userId,
      new MfaFlowError("challenge_rejected", "challenge"),
      now
    );
  }

  const secret = decryptMfaValue(challenge.pending_secret_encrypted);
  const counter = findMatchingTotpCounter({ secret, code, at: now });
  if (counter === null) {
    return await auditFlowRejection(
      userId,
      new MfaFlowError("factor_rejected", "totp"),
      now
    );
  }

  const recoveryCodes = generateRecoveryCodes();
  try {
    return await runCompletionTransaction(async (session) => {
      const currentUser = assertChallengeUserState(
        challenge.user_state_hash,
        await MfaRepository.findEligibleUser(userId, session)
      );
      if (await MfaRepository.hasCredential(userId, session)) {
        rejectFlow("challenge_state_changed", "challenge");
      }

      const credential = await MfaRepository.createCredential(
        {
          user: userId,
          encrypted_secret: encryptMfaValue(secret),
          recovery_code_hashes: recoveryCodes.map(hashRecoveryCode),
          enabled_at: now,
        },
        session
      );
      if (
        !credential ||
        !(await MfaRepository.consumeTotpCounter(
          credential._id.toString(),
          counter,
          session
        ))
      ) {
        rejectFlow("factor_rejected", "totp");
      }

      const enrolledUser = await MfaRepository.incrementUserMfaVersion(
        userId,
        currentUser,
        session
      );
      if (!enrolledUser) {
        throw new MfaFlowError("challenge_state_changed", "challenge");
      }
      if (
        !(await MfaRepository.consumeChallenge(
          challenge._id.toString(),
          now,
          session
        ))
      ) {
        rejectFlow("challenge_rejected", "challenge");
      }

      await revokeUserSessions(userId, "user-state-changed", session, now);
      await appendMfaSuccessAudit("auth.mfa.enrolled", enrolledUser, {
        session,
        now,
      });
      const tokens = await createAuthSession(enrolledUser, {
        mfaVerifiedAt: now,
        session,
        now,
      });
      return { tokens, recovery_codes: recoveryCodes };
    });
  } catch (error) {
    if (error instanceof MfaFlowError) {
      return await auditFlowRejection(userId, error, now);
    }
    throw error;
  }
};

export const verifyChallenge = async (
  challengeToken: string,
  input: { code?: string; recovery_code?: string },
  now = new Date()
): Promise<MfaCompletion> => {
  await connectDB();
  const challenge = await registerAttempt(challengeToken, "verify", now);
  const userId = challenge.user.toString();
  await enforceKnownChallengeRateLimit(userId, now);

  try {
    return await runCompletionTransaction(async (session) => {
      const user = assertChallengeUserState(
        challenge.user_state_hash,
        await MfaRepository.findEligibleUser(userId, session)
      );
      const credential = await MfaRepository.findCredentialWithSecrets(
        userId,
        session
      );
      if (!credential) {
        throw new MfaFlowError("challenge_state_changed", "challenge");
      }

      let auditAction:
        | "auth.mfa.verified"
        | "auth.mfa.recovery_used"
        | undefined;
      if (input.code) {
        const secret = decryptMfaValue(credential.encrypted_secret);
        const counter = findMatchingTotpCounter({
          secret,
          code: input.code,
          at: now,
          lastUsedCounter: credential.last_used_counter,
        });
        if (
          counter === null ||
          !(await MfaRepository.consumeTotpCounter(
            credential._id.toString(),
            counter,
            session
          ))
        ) {
          rejectFlow("factor_rejected", "totp");
        }
        auditAction = "auth.mfa.verified";
      } else if (input.recovery_code) {
        const normalized = normalizeRecoveryCode(input.recovery_code);
        if (
          !/^[A-Z2-7]{16}$/.test(normalized) ||
          !(await MfaRepository.consumeRecoveryCodeHash(
            credential._id.toString(),
            hashRecoveryCode(normalized),
            session
          ))
        ) {
          rejectFlow("factor_rejected", "recovery-code");
        }
        auditAction = "auth.mfa.recovery_used";
      } else {
        rejectFlow("factor_rejected", "challenge");
      }
      if (!auditAction) {
        throw new MfaFlowError("factor_rejected", "challenge");
      }

      if (
        !(await MfaRepository.consumeChallenge(
          challenge._id.toString(),
          now,
          session
        ))
      ) {
        rejectFlow("challenge_rejected", "challenge");
      }
      await appendMfaSuccessAudit(auditAction, user, { session, now });
      const tokens = await createAuthSession(user, {
        mfaVerifiedAt: now,
        session,
        now,
      });
      return { tokens };
    });
  } catch (error) {
    if (error instanceof MfaFlowError) {
      return await auditFlowRejection(userId, error, now);
    }
    throw error;
  }
};
