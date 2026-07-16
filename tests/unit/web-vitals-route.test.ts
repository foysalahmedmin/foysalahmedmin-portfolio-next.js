import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createRequest = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://portfolio.test/api/observability/vitals", {
    method: "POST",
    headers: {
      origin: "https://portfolio.test",
      "sec-fetch-site": "same-origin",
      "content-type": "application/json",
      "content-length": String(new TextEncoder().encode(body).byteLength),
      ...headers,
    },
    body,
  });

describe("Web Vitals endpoint", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_WEB_VITALS_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("accepts a strict privacy-minimized metric", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { POST } = await import("@/app/api/observability/vitals/route");
    const response = await POST(
      createRequest(
        JSON.stringify({
          name: "LCP",
          value: 1730.5,
          delta: 80,
          rating: "good",
          navigation_type: "navigate",
          route_class: "home",
          device_class: "mobile",
          release: "release-1",
        })
      )
    );
    expect(response.status).toBe(204);
    expect(String(info.mock.calls[0]?.[0])).toContain("web.vital.measured");
  });

  it("rejects cross-origin and unknown payload fields", async () => {
    const { POST } = await import("@/app/api/observability/vitals/route");
    const body = JSON.stringify({
      name: "CLS",
      value: 0.05,
      delta: 0.01,
      rating: "good",
      route_class: "home",
      device_class: "desktop",
      release: "release-1",
      visitor_id: "must-not-be-accepted",
    });
    expect(
      (
        await POST(
          createRequest(body, { origin: "https://cross-origin.example" })
        )
      ).status
    ).toBe(403);
    expect((await POST(createRequest(body))).status).toBe(400);
  });
});
