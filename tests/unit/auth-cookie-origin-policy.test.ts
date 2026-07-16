import { shouldEnforceCookieMutationOrigin } from "@/middleware/auth.middleware";
import { describe, expect, it } from "vitest";

describe("cookie-authenticated mutation origin policy", () => {
  it("protects unsafe cookie methods while allowing reads and explicit bearer clients", () => {
    expect(shouldEnforceCookieMutationOrigin("POST", "cookie")).toBe(true);
    expect(shouldEnforceCookieMutationOrigin("PATCH", "cookie")).toBe(true);
    expect(shouldEnforceCookieMutationOrigin("DELETE", "cookie")).toBe(true);
    expect(shouldEnforceCookieMutationOrigin("GET", "cookie")).toBe(false);
    expect(shouldEnforceCookieMutationOrigin("POST", "bearer")).toBe(false);
  });
});
