import {
  assertBucketsAllowed,
  clearLocalAbuseBucketsForTests,
  consumeAbuseBucket,
  hashAbuseIdentifier,
} from "@/lib/security/abuse-control";
import { beforeEach, describe, expect, it } from "vitest";

describe("authentication abuse control", () => {
  beforeEach(() => clearLocalAbuseBucketsForTests());

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
});
