import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const outputPath = path.join(process.cwd(), ".env");
const secret = () => randomBytes(48).toString("base64url");

const values = {
  PORT: "3000",
  NEXT_PUBLIC_URL: "http://localhost:3000",
  RESET_PASSWORD_UI_LINK: "http://localhost:3000/admin/reset-password",

  // Owner-provided infrastructure.
  DATABASE_URL: "",

  BCRYPT_SALT_ROUNDS: "12",
  BOOTSTRAP_SUPER_ADMIN_EMAIL: "",
  BOOTSTRAP_SUPER_ADMIN_NAME: "",
  BOOTSTRAP_SUPER_ADMIN_PASSWORD: "",
  BOOTSTRAP_SUPER_ADMIN_CONFIRM: "CREATE_THE_ONLY_INITIAL_SUPER_ADMIN",

  JWT_ACCESS_SECRET: secret(),
  JWT_REFRESH_SECRET: secret(),
  SESSION_SECRET: secret(),
  AUDIT_HMAC_SECRET: secret(),
  PAGE_PREVIEW_SECRET: secret(),
  PAGE_PREVIEW_TTL_SECONDS: "600",
  AUTH_PUBLIC_SIGNUP_ENABLED: "false",
  // Local admin development has no enrolled MFA provider. Production must use
  // `required` unless the admin is protected by a separate private boundary.
  AUTH_ADMIN_MFA_MODE: "disabled",
  AUTH_MFA_ENCRYPTION_KEY: secret(),
  AUTH_MFA_ISSUER: "Foysalahmedmin Portfolio",
  AUTH_ABUSE_SECRET: secret(),
  AUTH_CLIENT_IP_HEADER: "x-forwarded-for",
  AUTH_TRUSTED_PROXY_HOPS: "0",

  AUTH_USER_EMAIL: "",
  AUTH_USER_EMAIL_PASSWORD: "",

  CONTACT_ALLOWED_ORIGINS: "http://localhost:3000",
  CONTACT_ABUSE_SECRET: secret(),
  CONTACT_CLIENT_IP_HEADER: "x-forwarded-for",
  CONTACT_TRUSTED_PROXY_HOPS: "0",
  CONTACT_MAX_BODY_BYTES: "16384",
  CONTACT_MIN_FILL_TIME_MS: "1500",
  CONTACT_MAX_FILL_TIME_MS: "7200000",
  CONTACT_RATE_LIMIT: "5",
  CONTACT_RATE_WINDOW_SECONDS: "600",
  CONTACT_RETENTION_DAYS: "365",
  CONTACT_REQUIRE_TRANSACTIONS: "false",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  CONTACT_WORKER_SECRET: secret(),
  CONTACT_WORKER_BATCH_SIZE: "10",
  CONTACT_WORKER_MAX_ATTEMPTS: "5",

  STORAGE_PROVIDER: "cloudinary",
  CLOUDINARY_CLOUD_NAME: "",
  CLOUDINARY_API_KEY: "",
  CLOUDINARY_API_SECRET: "",
  CLOUDINARY_FOLDER: "min",
  GCP_CREDENTIALS_PATH: "credentials/gcp.credentials.json",
  GCP_PROJECT_ID: "",
  GCP_BUCKET_NAME: "",
  GCP_PUBLIC_BUCKET_NAME: "",
  GCP_PRIVATE_BUCKET_NAME: "",
  MEDIA_UPLOAD_MAX_REQUEST_BYTES: "67108864",
  MEDIA_UPLOAD_MAX_CONCURRENCY: "3",
  MEDIA_RECONCILE_SECRET: secret(),

  MIGRATION_RELEASE: "",
  MIGRATION_LEASE_TTL_MS: "",
  MIGRATION_BACKUP_REFERENCE: "",
  MIGRATION_BACKUP_VERIFIED_AT: "",
  MIGRATION_WRITES_QUIESCED: "false",

  SEED_ENVIRONMENT: "development",
  SEED_ACTOR_EMAIL: "",
  SEED_MEDIA_ASSET_ROOT: "seed-assets",
  SEED_PRODUCTION_CONFIRM: "",
  SEED_RESET_CONFIRM: "",

  NEXT_PUBLIC_WEB_VITALS_ENABLED: "false",
  NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE: "0.1",
  NEXT_PUBLIC_RELEASE_ID: "local",
};

const serialize = (entries) =>
  Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")
    .concat("\n");

try {
  if (process.argv.includes("--sync")) {
    const current = await readFile(outputPath, "utf8");
    const existing = new Set(
      current
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
        .filter(Boolean)
    );
    const additions = Object.fromEntries(
      Object.entries(values).filter(([key]) => !existing.has(key))
    );
    if (Object.keys(additions).length) {
      const separator = current.endsWith("\n") ? "" : "\n";
      await writeFile(
        outputPath,
        `${current}${separator}${serialize(additions)}`,
        { encoding: "utf8", mode: 0o600 }
      );
    }
    process.stdout.write(
      `Synchronized .env without changing existing values (${Object.keys(additions).length} added).\n`
    );
  } else {
    await writeFile(outputPath, serialize(values), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    process.stdout.write(
      "Created ignored .env with generated local secrets. Fill the blank owner-provided values before using their features.\n"
    );
  }
} catch (error) {
  if (error?.code === "EEXIST") {
    process.stderr.write(
      "Refusing to overwrite .env. Move or remove it explicitly before regenerating.\n"
    );
    process.exitCode = 1;
  } else {
    throw error;
  }
}
