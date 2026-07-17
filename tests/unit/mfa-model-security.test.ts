import MfaChallenge from "@/app/api/auth/mfa-challenge.model";
import MfaCredential from "@/app/api/auth/mfa-credential.model";
import { describe, expect, it } from "vitest";

describe("MFA persistence redaction", () => {
  it("marks every credential and challenge secret as non-selectable", () => {
    expect(MfaCredential.schema.path("encrypted_secret").options.select).toBe(
      false
    );
    expect(
      MfaCredential.schema.path("recovery_code_hashes").options.select
    ).toBe(false);
    expect(MfaChallenge.schema.path("token_hash").options.select).toBe(false);
    expect(MfaChallenge.schema.path("user_state_hash").options.select).toBe(
      false
    );
    expect(
      MfaChallenge.schema.path("pending_secret_encrypted").options.select
    ).toBe(false);
  });

  it("redacts sensitive values from accidental JSON serialization", () => {
    const credential = new MfaCredential({
      user: "507f1f77bcf86cd799439011",
      encrypted_secret: "must-not-leak",
      recovery_code_hashes: ["a".repeat(64)],
      last_used_counter: 42,
      enabled_at: new Date(),
    });
    const challenge = new MfaChallenge({
      user: "507f1f77bcf86cd799439011",
      purpose: "enroll",
      token_hash: "b".repeat(64),
      user_state_hash: "c".repeat(64),
      pending_secret_encrypted: "must-not-leak",
      expires_at: new Date(Date.now() + 60_000),
    });

    expect(JSON.stringify(credential)).not.toMatch(
      /must-not-leak|recovery_code_hashes|last_used_counter/
    );
    expect(JSON.stringify(challenge)).not.toMatch(
      /must-not-leak|token_hash|user_state_hash|pending_secret/
    );
  });
});
