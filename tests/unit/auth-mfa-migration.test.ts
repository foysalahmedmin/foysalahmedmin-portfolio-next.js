import {
  AUTH_MFA_INDEX_TARGETS,
  AUTH_MFA_USER_BACKFILL_FILTER,
  isAuthMfaIndexReady,
} from "@/lib/db/migrations/202607170001-auth-mfa-foundation";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";
import { describe, expect, it } from "vitest";

describe("auth MFA foundation migration", () => {
  it("is registered after the existing immutable foundations", () => {
    const ids = MIGRATION_REGISTRY.map(({ id }) => id);
    expect(ids.at(-1)).toBe("202607170001-auth-mfa-foundation");
    expect(ids.indexOf("202607170001-auth-mfa-foundation")).toBeGreaterThan(
      ids.indexOf("202607150014-public-content-cache-invalidation")
    );
  });

  it("indexes only hashed challenge, ownership, state, and expiry fields", () => {
    expect(AUTH_MFA_INDEX_TARGETS.map(({ options }) => options.name)).toEqual([
      "unique_mfa_credential_user",
      "unique_mfa_challenge_token_hash",
      "mfa_challenge_user_state",
      "expire_mfa_challenges",
    ]);
    const serialized = JSON.stringify(AUTH_MFA_INDEX_TARGETS);
    expect(serialized).not.toContain("encrypted_secret");
    expect(serialized).not.toContain("recovery_code_hashes");
    expect(serialized).not.toContain("pending_secret_encrypted");
  });

  it("backfills the zero MFA version for accounts created before MFA", () => {
    expect(AUTH_MFA_USER_BACKFILL_FILTER).toEqual({
      mfa_version: { $exists: false },
    });
  });

  it("does not accept a same-name challenge index without uniqueness", () => {
    const target = AUTH_MFA_INDEX_TARGETS[1]!;
    expect(
      isAuthMfaIndexReady(
        { name: target.options.name, key: target.key },
        target
      )
    ).toBe(false);
    expect(
      isAuthMfaIndexReady(
        { name: target.options.name, key: target.key, unique: true },
        target
      )
    ).toBe(true);
  });
});
