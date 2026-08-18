import { ENV } from "@/config";
import {
  assertBucketsAllowed,
  clearLocalAbuseBucketsForTests,
  consumeAbuseBucket,
  hashAbuseIdentifier,
} from "@/lib/security/abuse-control";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("authentication abuse control", () => {
  const originalEnvironment = ENV.environment;
  const originalUpstashUrl = ENV.upstash_redis_rest_url;
  const originalUpstashToken = ENV.upstash_redis_rest_token;

  beforeEach(() => clearLocalAbuseBucketsForTests());
  afterEach(() => {
    vi.unstubAllGlobals();
    ENV.environment = originalEnvironment;
    ENV.upstash_redis_rest_url = originalUpstashUrl;
    ENV.upstash_redis_rest_token = originalUpstashToken;
    clearLocalAbuseBucketsForTests();
  });

  it("never uses the raw identifier as a bucket key", () => {
    const raw = "admin@example.test";
    const hash = hashAbuseIdentifier("auth-account", raw);
    expect(hash).toMatch(/^[a-f\d]{64}$/);
    expect(hash).not.toContain(raw);
  });

  it("blocks after the bounded local allowance in test mode", async () => {
    const first = await consumeAbuseBucket({
      key: "auth:test:bucket",
      limit: 1,
      windowSeconds: 60,
    });
    const second = await consumeAbuseBucket({
      key: "auth:test:bucket",
      limit: 1,
      windowSeconds: 60,
    });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(() => assertBucketsAllowed([second])).toThrow(/Too many attempts/);
  });

  it("keeps enforcing in-process limits in production when no distributed store is configured", async () => {
    ENV.environment = "production";
    ENV.upstash_redis_rest_url = "";
    ENV.upstash_redis_rest_token = "";

    const first = await consumeAbuseBucket({
      key: "auth:production:no-store",
      limit: 1,
      windowSeconds: 60,
    });
    const second = await consumeAbuseBucket({
      key: "auth:production:no-store",
      limit: 1,
      windowSeconds: 60,
    });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });

  it("uses the distributed store in production when Upstash is configured", async () => {
    ENV.environment = "production";
    ENV.upstash_redis_rest_url = "https://upstash.test/";
    ENV.upstash_redis_rest_token = "upstash-token";
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify([{ result: 9 }, { result: 1 }, { result: 42 }]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await consumeAbuseBucket({
      key: "auth:production:with-store",
      limit: 5,
      windowSeconds: 60,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://upstash.test/pipeline",
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 42 });
  });

  it("falls back to in-process limits in production when the distributed store errors", async () => {
    ENV.environment = "production";
    ENV.upstash_redis_rest_url = "https://upstash.test";
    ENV.upstash_redis_rest_token = "upstash-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const first = await consumeAbuseBucket({
      key: "auth:production:store-down",
      limit: 1,
      windowSeconds: 60,
    });
    const second = await consumeAbuseBucket({
      key: "auth:production:store-down",
      limit: 1,
      windowSeconds: 60,
    });
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });
});
