import { defineConfig, devices } from "@playwright/test";

const DEFAULT_E2E_PORT = 3_107;

const readE2ePort = () => {
  const rawPort = process.env.PLAYWRIGHT_PORT;
  if (!rawPort) return DEFAULT_E2E_PORT;

  if (!/^\d+$/.test(rawPort)) {
    throw new Error("PLAYWRIGHT_PORT must be a whole-number TCP port.");
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1_024 || port > 65_535) {
    throw new Error("PLAYWRIGHT_PORT must be between 1024 and 65535.");
  }

  return port;
};

const normalizeBaseURL = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("PLAYWRIGHT_BASE_URL must use http or https.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "PLAYWRIGHT_BASE_URL must not contain credentials, a query, or a hash."
    );
  }
  if (url.pathname !== "/") {
    throw new Error(
      "PLAYWRIGHT_BASE_URL must point to the application origin."
    );
  }

  return url.origin;
};

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const e2ePort = readE2ePort();
const baseURL = normalizeBaseURL(
  externalBaseURL || `http://127.0.0.1:${e2ePort}`
);
const healthcheckURL = new URL("/contact", baseURL).toString();

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/playwright",
  globalSetup: "./tests/e2e/support/verify-portfolio-server.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["line"],
        [
          "html",
          { outputFolder: "test-results/playwright-report", open: "never" },
        ],
      ]
    : [["list"]],
  expect: { timeout: 7_500, toHaveScreenshot: { animations: "disabled" } },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "firefox-desktop",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "webkit-desktop",
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `pnpm dev --hostname 127.0.0.1 --port ${e2ePort}`,
        url: healthcheckURL,
        // A running process on the E2E port must fail loudly instead of being
        // mistaken for this application. This is intentionally strict locally
        // and in CI.
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_URL: baseURL,
          DATABASE_URL:
            process.env.TEST_MONGODB_URI ||
            "mongodb://127.0.0.1:27017/portfolio_e2e",
        },
      },
});
