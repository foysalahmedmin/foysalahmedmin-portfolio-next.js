import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const contactStatusRegion = (page: Page) =>
  page.locator("#contact-form-status");

test("contact submission reports success only after a stored receipt response", async ({
  page,
}) => {
  let receivedBody: Record<string, unknown> | undefined;
  await page.route("**/api/contacts", async (route) => {
    receivedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        status: 201,
        message: "Your message was received.",
        data: { receipt: "MIN-0123456789ABCDEF", duplicate: false },
      }),
    });
  });

  await page.goto("/contact");
  await page.getByLabel("Full Name").fill("Test Visitor");
  await page.getByLabel("Email Address").fill("visitor@example.test");
  await page.getByLabel("Subject").fill("Architecture review");
  await page
    .getByLabel("Message")
    .fill("Please review the system boundaries and delivery constraints.");
  await page.getByRole("button", { name: /send message/i }).click();

  await expect(contactStatusRegion(page)).toHaveAttribute("role", "status");
  await expect(contactStatusRegion(page)).toContainText(
    "Reference: MIN-0123456789ABCDEF"
  );
  expect(receivedBody).toMatchObject({
    name: "Test Visitor",
    email: "visitor@example.test",
    subject: "Architecture review",
  });
  expect(receivedBody?.form_started_at).toEqual(expect.any(Number));
});

test("contact validation focuses the visitor on actionable field errors", async ({
  page,
}) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(contactStatusRegion(page)).toHaveAttribute("role", "alert");
  await expect(contactStatusRegion(page)).toContainText("highlighted fields");
  await expect(page.locator("#contact-name-error")).toBeVisible();
});

test("contact timeout remains retryable without changing the submission key", async ({
  page,
}) => {
  test.slow();
  const keys: string[] = [];
  await page.route("**/api/contacts", async (route) => {
    keys.push(route.request().headers()["idempotency-key"] || "");
    await new Promise((resolve) => setTimeout(resolve, 13_000));
    await route.abort();
  });

  await page.goto("/contact");
  await page.getByLabel("Full Name").fill("Test Visitor");
  await page.getByLabel("Email Address").fill("visitor@example.test");
  await page.getByLabel("Subject").fill("Retry semantics");
  await page
    .getByLabel("Message")
    .fill("This message verifies timeout and safe retry behavior.");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(contactStatusRegion(page)).toContainText("timed out", {
    timeout: 15_000,
  });
  await expect(contactStatusRegion(page)).toHaveAttribute("role", "alert");
  await page.getByRole("button", { name: /retry message/i }).click();
  await expect.poll(() => keys.length).toBeGreaterThanOrEqual(2);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
});
