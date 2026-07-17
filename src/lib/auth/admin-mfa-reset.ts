import { appendAuditEvent } from "@/app/api/audit-events/audit-event.service";
import * as MfaRepository from "@/app/api/auth/mfa.repository";
import { hasCapability } from "@/lib/auth/capabilities";
import { revokeUserSessions } from "@/lib/auth/session-manager";
import connectDB from "@/lib/db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRMATION_PREFIX = "RESET_MFA_FOR:";

export class AdminMfaResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminMfaResetError";
  }
}

export type AdminMfaResetInput = Readonly<{
  email: string;
  confirmation: string;
}>;

export type AdminMfaResetResult = Readonly<{
  reset: true;
  user_id: string;
  email: string;
}>;

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const getAdminMfaResetConfirmation = (email: string): string =>
  `${CONFIRMATION_PREFIX}${normalizeEmail(email)}`;

export const parseAdminMfaResetArgs = (
  args: readonly string[]
): AdminMfaResetInput => {
  const values = new Map<string, string>();
  for (const argument of args) {
    const separator = argument.indexOf("=");
    const name = separator > 0 ? argument.slice(0, separator) : "";
    const value = separator > 0 ? argument.slice(separator + 1) : "";
    if (!["--email", "--confirm"].includes(name) || !value) {
      throw new AdminMfaResetError(
        "Use --email=<admin-email> and --confirm=RESET_MFA_FOR:<admin-email>."
      );
    }
    if (values.has(name)) {
      throw new AdminMfaResetError(`Duplicate ${name} argument.`);
    }
    values.set(name, value);
  }

  const email = normalizeEmail(values.get("--email") ?? "");
  const confirmation = values.get("--confirm")?.trim() ?? "";
  if (
    !EMAIL_PATTERN.test(email) ||
    email.length > 254 ||
    confirmation !== getAdminMfaResetConfirmation(email)
  ) {
    throw new AdminMfaResetError(
      "The named admin email or target-specific confirmation is invalid."
    );
  }
  return { email, confirmation };
};

export const resetAdminMfa = async (
  input: AdminMfaResetInput,
  now = new Date()
): Promise<AdminMfaResetResult> => {
  const parsed = parseAdminMfaResetArgs([
    `--email=${input.email}`,
    `--confirm=${input.confirmation}`,
  ]);
  const db = await connectDB();
  const session = await db.startSession();
  let result: AdminMfaResetResult | undefined;

  try {
    await session.withTransaction(async () => {
      const user = await MfaRepository.findResetEligibleUserByEmail(
        parsed.email,
        session
      );
      if (
        !user ||
        user.is_deleted ||
        user.status === "blocked" ||
        !hasCapability(user.role, "admin:access")
      ) {
        throw new AdminMfaResetError(
          "The named account is not eligible for an MFA reset."
        );
      }

      const userId = user._id.toString();
      if (!(await MfaRepository.deleteCredentialForUser(userId, session))) {
        throw new AdminMfaResetError(
          "The named account has no enrolled MFA credential."
        );
      }
      await MfaRepository.invalidateActiveChallenges(userId, now, session);
      const updatedUser = await MfaRepository.incrementUserMfaVersion(
        userId,
        user,
        session
      );
      if (!updatedUser) {
        throw new AdminMfaResetError(
          "The account security state changed during the MFA reset."
        );
      }
      await revokeUserSessions(userId, "user-state-changed", session, now);
      await appendAuditEvent(
        {
          action: "auth.mfa.reset",
          actor: { type: "system" },
          target: { type: "user", id: userId },
          source: "admin",
          summary_code: "auth_mfa_reset",
          changed_fields: ["mfa"],
          reason_code: "operator_break_glass",
          metadata: {
            request_channel: "cli",
            security_signal: "mfa-reset",
            transactional: true,
          },
        },
        { session, now }
      );
      result = { reset: true, user_id: userId, email: parsed.email };
    });
  } finally {
    await session.endSession();
  }

  if (!result) {
    throw new AdminMfaResetError("The MFA reset transaction did not complete.");
  }
  return result;
};
