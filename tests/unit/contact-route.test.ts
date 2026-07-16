import { clearLocalContactRateLimitsForTests } from "@/app/api/contacts/contact-security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submitContact: vi.fn(),
}));

vi.mock("@/app/api/contacts/contact-intake.service", () => ({
  submitContact: mocks.submitContact,
}));

import { POST } from "@/app/api/contacts/route";

const validBody = () => ({
  name: "Grace Hopper",
  email: "grace@example.com",
  subject: "Platform engineering",
  message: "I would like to discuss a reliable platform build.",
  company_website: "",
  form_started_at: Date.now() - 3_000,
});

const createRequest = (
  body: Record<string, unknown>,
  overrides: Record<string, string> = {}
) =>
  new NextRequest("http://localhost:3000/api/contacts", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "idempotency-key": "67e55044-10b1-426f-9247-bb680e5fe0c8",
      "x-contact-session": "77e55044-10b1-426f-9247-bb680e5fe0c8",
      "x-forwarded-for": "203.0.113.41",
      ...overrides,
    },
    body: JSON.stringify(body),
  });

describe("POST /api/contacts", () => {
  beforeEach(() => {
    mocks.submitContact.mockReset();
    clearLocalContactRateLimitsForTests();
  });

  it("returns only the opaque receipt after persistence", async () => {
    mocks.submitContact.mockResolvedValue({
      receipt: "MIN-ABCDEF1234567890",
      duplicate: false,
    });

    const response = await POST(createRequest(validBody()));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(payload).toMatchObject({
      success: true,
      data: {
        receipt: "MIN-ABCDEF1234567890",
        duplicate: false,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("grace@example.com");
    expect(JSON.stringify(payload)).not.toContain("reliable platform");
  });

  it("rejects cross-site and honeypot submissions before persistence", async () => {
    const crossSite = await POST(
      createRequest(validBody(), {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      })
    );
    const honeypot = await POST(
      createRequest({
        ...validBody(),
        company_website: "https://spam.example",
      })
    );

    expect(crossSite.status).toBe(403);
    expect(honeypot.status).toBe(422);
    expect(await honeypot.json()).toMatchObject({
      success: false,
      code: "invalid_submission",
    });
    expect(mocks.submitContact).not.toHaveBeenCalled();
  });
});
