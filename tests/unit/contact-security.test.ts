import {
  contactSubmissionSchema,
  contactVisibleFieldsSchema,
} from "@/app/api/contacts/contact-public.contract";
import {
  assertContactTimingAndHoneypot,
  assertTrustedContactRequest,
  clearLocalContactRateLimitsForTests,
  ContactSecurityError,
  enforceContactRateLimit,
  getTrustedClientIp,
  hmacContactValue,
  readContactJsonBody,
} from "@/app/api/contacts/contact-security";
import { ENV } from "@/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "http://localhost:3000";

const request = (
  body: unknown,
  headers: Record<string, string> = {}
): Request =>
  new Request(`${ORIGIN}/api/contacts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": "203.0.113.8",
      "x-contact-session": "67e55044-10b1-426f-9247-bb680e5fe0c8",
      ...headers,
    },
    body: JSON.stringify(body),
  });

const validSubmission = (now = Date.now()) => ({
  name: "  Foysal Ahmed  ",
  email: "  CLIENT@EXAMPLE.COM ",
  subject: "Project architecture",
  message: "I would like to discuss a production platform.",
  company_website: "",
  form_started_at: now - 2_000,
});

describe("contact public contract", () => {
  it("normalizes visible fields and rejects unknown/operator-shaped input", () => {
    const parsed = contactSubmissionSchema.parse(validSubmission());
    expect(parsed.name).toBe("Foysal Ahmed");
    expect(parsed.email).toBe("client@example.com");

    expect(() =>
      contactSubmissionSchema.parse({
        ...validSubmission(),
        $where: "return true",
      })
    ).toThrow();
    expect(() =>
      contactVisibleFieldsSchema.parse({
        ...validSubmission(),
        subject: "Injected\r\nBcc: victim@example.com",
      })
    ).toThrow();
  });

  it("rejects honeypot hits and implausibly fast submissions", () => {
    const now = Date.now();
    expect(() =>
      assertContactTimingAndHoneypot(
        contactSubmissionSchema.parse({
          ...validSubmission(now),
          company_website: "https://bot.example",
        }),
        now
      )
    ).toThrow();

    expect(() =>
      assertContactTimingAndHoneypot(
        contactSubmissionSchema.parse({
          ...validSubmission(now),
          form_started_at: now - 100,
        }),
        now
      )
    ).toThrow(ContactSecurityError);
  });
});

describe("contact request security", () => {
  const originalEnvironment = ENV.environment;
  const originalUpstashUrl = ENV.upstash_redis_rest_url;
  const originalUpstashToken = ENV.upstash_redis_rest_token;

  beforeEach(() => clearLocalContactRateLimitsForTests());
  afterEach(() => {
    vi.unstubAllGlobals();
    ENV.environment = originalEnvironment;
    ENV.upstash_redis_rest_url = originalUpstashUrl;
    ENV.upstash_redis_rest_token = originalUpstashToken;
  });

  it("accepts the exact same origin and rejects cross-site metadata", () => {
    expect(() =>
      assertTrustedContactRequest(request(validSubmission()))
    ).not.toThrow();
    expect(() =>
      assertTrustedContactRequest(
        request(validSubmission(), {
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        })
      )
    ).toThrow(ContactSecurityError);
    expect(() =>
      assertTrustedContactRequest(
        request(validSubmission(), { "content-type": "text/plain" })
      )
    ).toThrowError(expect.objectContaining({ status: 415 }));
  });

  it("caps the raw body independently of Content-Length", async () => {
    await expect(
      readContactJsonBody(request(validSubmission()))
    ).resolves.toMatchObject({
      subject: "Project architecture",
    });

    const oversized = request({ message: "x".repeat(17_000) });
    await expect(readContactJsonBody(oversized)).rejects.toMatchObject({
      status: 413,
      code: "invalid_request",
    });
  });

  it("uses the configured trusted XFF position and never stores a raw abuse key", () => {
    expect(
      getTrustedClientIp(
        request(validSubmission(), {
          "x-forwarded-for": "198.51.100.4, 203.0.113.9",
        })
      )
    ).toBe("203.0.113.9");
    const digest = hmacContactValue("contact-ip", "203.0.113.9");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toContain("203.0.113.9");
  });

  it("limits both IP and browser-session buckets", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        enforceContactRateLimit(request(validSubmission()))
      ).resolves.toBeUndefined();
    }
    await expect(
      enforceContactRateLimit(request(validSubmission()))
    ).rejects.toMatchObject({ status: 429, code: "rate_limited" });
  });

  it("keeps enforcing in-process limits in production when no distributed authority is configured", async () => {
    ENV.environment = "production";
    ENV.upstash_redis_rest_url = "";
    ENV.upstash_redis_rest_token = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        enforceContactRateLimit(request(validSubmission()))
      ).resolves.toBeUndefined();
    }
    await expect(
      enforceContactRateLimit(request(validSubmission()))
    ).rejects.toMatchObject({ status: 429, code: "rate_limited" });
  });

  it("uses the distributed authority in production when Upstash is configured", async () => {
    ENV.environment = "production";
    ENV.upstash_redis_rest_url = "https://upstash.test";
    ENV.upstash_redis_rest_token = "upstash-token";
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(String(url));
        return new Response(
          JSON.stringify([{ result: 1 }, { result: 1 }, { result: 600 }]),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      })
    );

    await expect(
      enforceContactRateLimit(request(validSubmission()))
    ).resolves.toBeUndefined();
    expect(calls).toEqual([
      "https://upstash.test/pipeline",
      "https://upstash.test/pipeline",
    ]);
  });

  it("falls back to in-process limits in production when the distributed authority errors", async () => {
    ENV.environment = "production";
    ENV.upstash_redis_rest_url = "https://upstash.test";
    ENV.upstash_redis_rest_token = "upstash-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(
      enforceContactRateLimit(request(validSubmission()))
    ).resolves.toBeUndefined();
  });
});
