import {
  decryptMfaValue,
  encodeBase32,
  encryptMfaValue,
  findMatchingTotpCounter,
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  hashMfaChallengeToken,
  hashRecoveryCode,
  MFA_RECOVERY_CODE_COUNT,
} from "@/lib/auth/mfa-security";
import {
  getAdminMfaGate,
  isMfaSessionAccepted,
  resolveAdminMfaMode,
} from "@/lib/auth/mfa-policy";
import { ENV } from "@/config";
import { createHmac, hkdfSync } from "node:crypto";
import { describe, expect, it } from "vitest";

describe("native TOTP implementation", () => {
  it("matches the RFC 6238 SHA-1 vector truncated to six digits", () => {
    const secret = encodeBase32(Buffer.from("12345678901234567890", "ascii"));
    expect(generateTotpCode(secret, 1)).toBe("287082");
  });

  it("accepts only the bounded window and rejects a replayed counter", () => {
    const secret = generateTotpSecret();
    const at = new Date("2026-07-17T12:00:00.000Z");
    const counter = Math.floor(at.getTime() / 1_000 / 30);
    const code = generateTotpCode(secret, counter);

    expect(findMatchingTotpCounter({ secret, code, at })).toBe(counter);
    expect(
      findMatchingTotpCounter({
        secret,
        code,
        at,
        lastUsedCounter: counter,
      })
    ).toBeNull();
    expect(
      findMatchingTotpCounter({
        secret,
        code,
        at: new Date(at.getTime() + 2 * 30_000),
      })
    ).toBeNull();
  });
});

describe("MFA secret and recovery protection", () => {
  it("round-trips authenticated encryption and rejects tampering", () => {
    const plaintext = generateTotpSecret();
    const encrypted = encryptMfaValue(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(decryptMfaValue(encrypted)).toBe(plaintext);
    const tampered = `${encrypted.slice(0, -1)}${
      encrypted.endsWith("A") ? "B" : "A"
    }`;
    expect(() => decryptMfaValue(tampered)).toThrow(/temporarily unavailable/i);
  });

  it("stores stable keyed hashes while formatting recovery codes for people", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(MFA_RECOVERY_CODE_COUNT);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z2-7]{8}-[A-Z2-7]{8}$/.test(code))).toBe(
      true
    );
    expect(hashRecoveryCode(codes[0]!)).toBe(
      hashRecoveryCode(codes[0]!.replace("-", "").toLowerCase())
    );
    expect(hashRecoveryCode(codes[0]!)).not.toContain(codes[0]!);
  });

  it("hashes opaque challenges without persisting the bearer value", () => {
    const token = "a".repeat(43);
    expect(hashMfaChallengeToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashMfaChallengeToken(token)).not.toContain(token);
  });

  it("derives purpose keys from the decoded key bytes", () => {
    const token = "b".repeat(43);
    const masterKey = Buffer.from(ENV.auth_mfa_encryption_key!, "base64url");
    const purposeKey = Buffer.from(
      hkdfSync(
        "sha256",
        masterKey,
        Buffer.from("foysalahmedmin-portfolio-mfa-key-derivation", "utf8"),
        Buffer.from("portfolio-admin-mfa-v1:recovery", "utf8"),
        32
      )
    );
    const expected = createHmac("sha256", purposeKey)
      .update(`challenge\0${token}`, "utf8")
      .digest("hex");

    expect(hashMfaChallengeToken(token)).toBe(expected);
  });

  it("fails closed for placeholders and a key reused from another boundary", () => {
    const configured = ENV.auth_mfa_encryption_key;
    try {
      ENV.auth_mfa_encryption_key =
        "replace-with-a-distinct-random-32-byte-base64url-key";
      expect(() => encryptMfaValue("secret")).toThrow(
        /temporarily unavailable/i
      );

      ENV.auth_mfa_encryption_key = ENV.session_secret;
      expect(() => encryptMfaValue("secret")).toThrow(
        /temporarily unavailable/i
      );
    } finally {
      ENV.auth_mfa_encryption_key = configured;
    }
  });
});

describe("production MFA gate", () => {
  it("covers every admin-capable role and requires a verified session", () => {
    for (const role of [
      "contributor",
      "author",
      "editor",
      "admin",
      "super-admin",
    ] as const) {
      expect(getAdminMfaGate(role, "production", "required")).toBe("required");
      expect(isMfaSessionAccepted(role, null, "production", "required")).toBe(
        false
      );
      expect(
        isMfaSessionAccepted(
          role,
          new Date("2026-01-01T00:00:00.000Z"),
          "production",
          "required"
        )
      ).toBe(true);
    }
    expect(getAdminMfaGate("user", "production", "required")).toBe(
      "not-required"
    );
    expect(isMfaSessionAccepted("admin", null, "production", "disabled")).toBe(
      true
    );
  });

  it("parses only the authoritative enum and defaults production securely", () => {
    expect(resolveAdminMfaMode("required", "production")).toBe("required");
    expect(resolveAdminMfaMode("disabled", "production")).toBe("disabled");
    expect(resolveAdminMfaMode(undefined, "production")).toBe("required");
    expect(resolveAdminMfaMode("off", "production")).toBe("required");
    expect(resolveAdminMfaMode(undefined, "development")).toBe("disabled");
    expect(getAdminMfaGate("admin", "development", "required")).toBe(
      "required"
    );
  });
});
