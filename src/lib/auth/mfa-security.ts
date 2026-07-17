import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import httpStatus from "http-status";

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
export const TOTP_WINDOW_STEPS = 1;
export const MFA_CHALLENGE_TTL_SECONDS = 5 * 60;
export const MFA_CHALLENGE_MAX_ATTEMPTS = 5;
export const MFA_RECOVERY_CODE_COUNT = 10;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ENCRYPTED_VALUE_PATTERN =
  /^v1\.([A-Za-z0-9_-]{16})\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{22})$/;
const MFA_KEY_INFO = Buffer.from("portfolio-admin-mfa-v1", "utf8");
const MFA_KEY_SALT = Buffer.from(
  "foysalahmedmin-portfolio-mfa-key-derivation",
  "utf8"
);

const unavailable = (): AppError =>
  new AppError(
    httpStatus.SERVICE_UNAVAILABLE,
    "Multi-factor authentication is temporarily unavailable."
  );

const getMasterSecret = (): Buffer => {
  const secret = ENV.auth_mfa_encryption_key?.trim() ?? "";
  const otherSecrets = [
    ENV.jwt_access_secret,
    ENV.jwt_refresh_secret,
    ENV.session_secret,
    ENV.auth_abuse_secret,
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  const placeholderPattern =
    /(?:change|example|placeholder|replace|sample|test|your[-_]?key)/i;
  const decoded =
    /^[A-Za-z0-9_-]{43,}$/.test(secret) && !placeholderPattern.test(secret)
      ? Buffer.from(secret, "base64url")
      : Buffer.alloc(0);
  const isCanonical =
    decoded.length >= 32 && decoded.toString("base64url") === secret;
  const hasPlausibleDiversity = new Set(secret).size >= 16;

  if (!isCanonical || !hasPlausibleDiversity || otherSecrets.includes(secret)) {
    throw unavailable();
  }
  return decoded;
};

const deriveKey = (purpose: "encryption" | "recovery"): Buffer =>
  Buffer.from(
    hkdfSync(
      "sha256",
      getMasterSecret(),
      MFA_KEY_SALT,
      Buffer.concat([MFA_KEY_INFO, Buffer.from(`:${purpose}`, "utf8")]),
      32
    )
  );

export const encodeBase32 = (value: Uint8Array): string => {
  let bits = 0;
  let buffer = 0;
  let output = "";

  for (const byte of value) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
};

export const decodeBase32 = (input: string): Buffer => {
  const normalized = input.trim().toUpperCase().replace(/=+$/g, "");
  if (!normalized || !/^[A-Z2-7]+$/.test(normalized)) throw unavailable();

  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const value = BASE32_ALPHABET.indexOf(character);
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const generateTotpSecret = (): string => encodeBase32(randomBytes(20));

const counterBuffer = (counter: number): Buffer => {
  if (!Number.isSafeInteger(counter) || counter < 0) throw unavailable();
  const value = Buffer.alloc(8);
  value.writeBigUInt64BE(BigInt(counter));
  return value;
};

export const getTotpCounter = (at = new Date()): number =>
  Math.floor(at.getTime() / 1_000 / TOTP_PERIOD_SECONDS);

export const generateTotpCode = (secret: string, counter: number): string => {
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counterBuffer(counter))
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
};

export const findMatchingTotpCounter = (input: {
  secret: string;
  code: string;
  at?: Date;
  lastUsedCounter?: number | null;
}): number | null => {
  if (!/^\d{6}$/.test(input.code)) return null;
  const currentCounter = getTotpCounter(input.at);
  let match: number | null = null;

  for (
    let offset = -TOTP_WINDOW_STEPS;
    offset <= TOTP_WINDOW_STEPS;
    offset += 1
  ) {
    const counter = currentCounter + offset;
    if (counter < 0) continue;
    const expected = Buffer.from(generateTotpCode(input.secret, counter));
    const presented = Buffer.from(input.code);
    if (
      expected.length === presented.length &&
      timingSafeEqual(expected, presented) &&
      counter > (input.lastUsedCounter ?? -1)
    ) {
      match = Math.max(match ?? counter, counter);
    }
  }
  return match;
};

export const encryptMfaValue = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("encryption"), iv);
  cipher.setAAD(MFA_KEY_INFO);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
};

export const decryptMfaValue = (encrypted: string): string => {
  const match = ENCRYPTED_VALUE_PATTERN.exec(encrypted);
  if (!match) throw unavailable();

  try {
    const iv = Buffer.from(match[1]!, "base64url");
    const ciphertext = Buffer.from(match[2]!, "base64url");
    const tag = Buffer.from(match[3]!, "base64url");
    if (
      iv.toString("base64url") !== match[1] ||
      ciphertext.toString("base64url") !== match[2] ||
      tag.toString("base64url") !== match[3]
    ) {
      throw new Error("non_canonical_encryption");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey("encryption"),
      iv
    );
    decipher.setAAD(MFA_KEY_INFO);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw unavailable();
  }
};

export const createMfaChallengeToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashMfaChallengeToken = (token: string): string =>
  createHmac("sha256", deriveKey("recovery"))
    .update(`challenge\0${token}`, "utf8")
    .digest("hex");

export const normalizeRecoveryCode = (code: string): string =>
  code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");

export const hashRecoveryCode = (code: string): string =>
  createHmac("sha256", deriveKey("recovery"))
    .update(`recovery\0${normalizeRecoveryCode(code)}`, "utf8")
    .digest("hex");

export const generateRecoveryCodes = (): string[] =>
  Array.from({ length: MFA_RECOVERY_CODE_COUNT }, () => {
    const encoded = encodeBase32(randomBytes(10));
    return `${encoded.slice(0, 8)}-${encoded.slice(8, 16)}`;
  });
