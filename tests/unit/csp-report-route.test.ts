import { POST } from "@/app/api/security/csp-report/route";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.restoreAllMocks());

describe("CSP report endpoint", () => {
  it("accepts a bounded report and logs only normalized operational fields", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const body = JSON.stringify({
      "csp-report": {
        "document-uri": "https://portfolio.test/private/path?token=secret",
        "blocked-uri": "https://blocked.example/script.js?secret=value",
        "effective-directive": "script-src-elem",
        disposition: "enforce",
      },
    });
    const response = await POST(
      new Request("https://portfolio.test/api/security/csp-report", {
        method: "POST",
        headers: {
          "content-type": "application/csp-report",
          "content-length": String(new TextEncoder().encode(body).byteLength),
        },
        body,
      })
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
    const log = String(warn.mock.calls[0]?.[0]);
    expect(log).toContain("browser.csp.violation");
    expect(log).toContain("https://portfolio.test");
    expect(log).not.toContain("private/path");
    expect(log).not.toContain("secret");
  });

  it("rejects unsupported media and oversized reports", async () => {
    const unsupported = await POST(
      new Request("https://portfolio.test/api/security/csp-report", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "{}",
      })
    );
    expect(unsupported.status).toBe(415);

    const oversized = await POST(
      new Request("https://portfolio.test/api/security/csp-report", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "20000",
        },
        body: "{}",
      })
    );
    expect(oversized.status).toBe(413);
  });
});
