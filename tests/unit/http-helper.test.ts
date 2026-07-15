import { describe, expect, it } from "vitest";
import { createTestRequest, readJsonResponse } from "../helpers/http";

describe("HTTP test helpers", () => {
  it("builds deterministic JSON requests with encoded cookies", async () => {
    const request = createTestRequest("/api/example?page=2", {
      method: "POST",
      body: { enabled: false },
      cookies: { access_token: "token value" },
    });

    expect(request.nextUrl.pathname).toBe("/api/example");
    expect(request.nextUrl.searchParams.get("page")).toBe("2");
    expect(request.headers.get("content-type")).toBe("application/json");
    expect(request.cookies.get("access_token")?.value).toBe("token value");
    await expect(request.json()).resolves.toEqual({ enabled: false });
  });

  it("reads JSON responses and rejects misleading content types", async () => {
    const response = Response.json({ success: true });

    await expect(
      readJsonResponse<{ success: boolean }>(response)
    ).resolves.toEqual({ success: true });

    await expect(
      readJsonResponse(
        new Response("{}", { headers: { "content-type": "text/plain" } })
      )
    ).rejects.toThrow("Expected an application/json response.");
  });
});
