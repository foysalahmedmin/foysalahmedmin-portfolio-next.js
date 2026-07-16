import {
  getCorrelationId,
  getSafeRequestPath,
} from "@/lib/observability/request-context";
import { describe, expect, it } from "vitest";

describe("request context", () => {
  it("accepts only bounded safe correlation IDs", () => {
    const trusted = new Request(
      "https://portfolio.test/api/projects?secret=hidden",
      {
        headers: { "x-correlation-id": "request_12345678" },
      }
    );
    expect(getCorrelationId(trusted)).toBe("request_12345678");
    expect(getSafeRequestPath(trusted)).toBe("/api/projects");
  });

  it("replaces unsafe identifiers", () => {
    const request = new Request("https://portfolio.test/api/projects", {
      headers: { "x-correlation-id": "short" },
    });
    expect(getCorrelationId(request)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
