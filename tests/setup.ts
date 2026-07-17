import "@testing-library/jest-dom/vitest";
import { assertSafeTestDatabaseUrl } from "./helpers/test-database";

const TEST_DEFAULTS: Readonly<Record<string, string>> = {
  DATABASE_URL: "mongodb://127.0.0.1:27017/foysalahmedmin_test",
  BCRYPT_SALT_ROUNDS: "4",
  JWT_ACCESS_SECRET: "test-access-secret-at-least-32-characters",
  JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-characters",
  RESET_PASSWORD_UI_LINK: "http://localhost:3000/admin/reset-password",
  SESSION_SECRET: "test-session-secret-at-least-32-characters",
  AUTH_ABUSE_SECRET: "test-auth-abuse-secret-at-least-32-characters",
  AUTH_CLIENT_IP_HEADER: "x-forwarded-for",
  AUTH_TRUSTED_PROXY_HOPS: "0",
  AUTH_PUBLIC_SIGNUP_ENABLED: "false",
  AUTH_ADMIN_MFA_MODE: "disabled",
  AUTH_MFA_ENCRYPTION_KEY:
    "q7X9mN2pK4vR8sT1uW3yZ5aC6dE0fG2hJ7kL9nP4rS8vX1zB3cD5eF7gH9jK2mN4",
  AUTH_MFA_ISSUER: "Portfolio Test",
  AUDIT_HMAC_SECRET: "test-audit-hmac-secret-at-least-32-characters",
  PAGE_PREVIEW_SECRET: "test-page-preview-secret-at-least-32-characters",
  PAGE_PREVIEW_TTL_SECONDS: "600",
  AUTH_USER_EMAIL: "test@example.com",
  AUTH_USER_EMAIL_PASSWORD: "not-a-real-password",
  CONTACT_ABUSE_SECRET: "test-contact-abuse-secret-at-least-32-characters",
  CONTACT_ALLOWED_ORIGINS: "http://localhost:3000",
  CONTACT_CLIENT_IP_HEADER: "x-forwarded-for",
  CONTACT_TRUSTED_PROXY_HOPS: "0",
  CONTACT_MIN_FILL_TIME_MS: "1500",
  CONTACT_MAX_FILL_TIME_MS: "7200000",
  CONTACT_RATE_LIMIT: "5",
  CONTACT_RATE_WINDOW_SECONDS: "600",
  CONTACT_RETENTION_DAYS: "365",
  CONTACT_REQUIRE_TRANSACTIONS: "false",
  CONTACT_WORKER_SECRET: "test-contact-worker-secret-at-least-32-characters",
  CONTACT_WORKER_BATCH_SIZE: "10",
  CONTACT_WORKER_MAX_ATTEMPTS: "5",
  STORAGE_PROVIDER: "cloudinary",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
  CLOUDINARY_FOLDER: "portfolio-test",
  GCP_PROJECT_ID: "portfolio-test",
  GCP_BUCKET_NAME: "portfolio-test",
  NEXT_PUBLIC_URL: "http://localhost:3000",
  TEST_TRANSACTION_MODE: "compensation",
};

for (const [key, value] of Object.entries(TEST_DEFAULTS)) {
  process.env[key] ??= value;
}

process.env.DATABASE_URL = assertSafeTestDatabaseUrl(
  process.env.TEST_DATABASE_URL ?? TEST_DEFAULTS.DATABASE_URL
);

if (process.env.NODE_ENV !== "test") {
  throw new Error("The test setup must only run with NODE_ENV=test.");
}
