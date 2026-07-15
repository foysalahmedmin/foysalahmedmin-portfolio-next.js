import "@testing-library/jest-dom/vitest";
import { assertSafeTestDatabaseUrl } from "./helpers/test-database";

const TEST_DEFAULTS: Readonly<Record<string, string>> = {
  DATABASE_URL: "mongodb://127.0.0.1:27017/foysalahmedmin_test",
  BCRYPT_SALT_ROUNDS: "4",
  DEFAULT_PASSWORD: "TestPassword123!",
  JWT_ACCESS_SECRET: "test-access-secret-at-least-32-characters",
  JWT_ACCESS_SECRET_EXPIRES_IN: "15m",
  JWT_REFRESH_SECRET: "test-refresh-secret-at-least-32-characters",
  JWT_REFRESH_SECRET_EXPIRES_IN: "7d",
  JWT_RESET_PASSWORD_SECRET: "test-reset-secret-at-least-32-characters",
  JWT_RESET_PASSWORD_SECRET_EXPIRES_IN: "15m",
  JWT_EMAIL_VERIFICATION_SECRET: "test-email-verification-secret-32-characters",
  JWT_EMAIL_VERIFICATION_SECRET_EXPIRES_IN: "1d",
  SESSION_SECRET: "test-session-secret-at-least-32-characters",
  AUTH_USER_EMAIL: "test@example.com",
  AUTH_USER_EMAIL_PASSWORD: "not-a-real-password",
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
