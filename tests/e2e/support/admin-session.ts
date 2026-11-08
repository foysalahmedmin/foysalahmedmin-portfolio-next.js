import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

/**
 * Authenticated admin sessions for Playwright (docs plan 7, Phase 7). The specs that use this skip unless
 * `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` name an admin of the database the server runs on (a
 * throwaway one: never a live admin). MFA must be off for that account (`AUTH_ADMIN_MFA_MODE=disabled`).
 * The sign-in goes through the real form once per worker; each test then gets a page that already holds
 * that session (the sign-in endpoint is rate limited, so it must not run per test).
 */
export const adminCredentials = () => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  return email && password ? { email, password } : null;
};

export const signInToAdmin = async (page: Page) => {
  const credentials = adminCredentials();
  if (!credentials)
    throw new Error("E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required");
  await page.goto("/admin/signin");
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/admin\/?$/, { timeout: 30_000 });
};

export const test = base.extend<{ admin: Page }, { adminState: StorageState }>({
  adminState: [
    async ({ browser }, provide, workerInfo) => {
      if (!adminCredentials()) {
        await provide({ cookies: [], origins: [] });
        return;
      }
      const context = await browser.newContext({
        baseURL: workerInfo.project.use.baseURL,
      });
      await signInToAdmin(await context.newPage());
      const state = await context.storageState();
      await context.close();
      await provide(state);
    },
    { scope: "worker" },
  ],
  /** A page that already holds the admin session; skipped when no credentials are configured. */
  admin: async ({ page, context, adminState }, provide, testInfo) => {
    testInfo.skip(
      !adminCredentials(),
      "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for a throwaway admin"
    );
    await context.addCookies(adminState.cookies);
    await page.goto("/admin");
    await provide(page);
  },
});

export { expect };
