import {
  assertTrustedAuthRequest,
  readTrustedAuthJson,
} from "@/lib/auth/auth-request-security";
import { describe, expect, it } from "vitest";

const authRequest = (
  body: BodyInit = JSON.stringify({ email: "admin@example.test" }),
  headers: Record<string, string> = {}
) =>
  new Request("http://localhost:3000/api/auth/signin", {
    method: "POST",
    body,
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
  });

describe("trusted authentication JSON boundary", () => {
  it("accepts and parses a bounded same-origin JSON request", async () => {
    await expect(readTrustedAuthJson(authRequest())).resolves.toEqual({
      email: "admin@example.test",
    });
  });

  it("rejects a missing or cross-site origin before parsing", () => {
    const missingOrigin = authRequest(undefined, { origin: "" });
    const crossSite = authRequest(undefined, {
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    });

    expect(() => assertTrustedAuthRequest(missingOrigin)).toThrow(
      /not allowed/i
    );
    expect(() => assertTrustedAuthRequest(crossSite)).toThrow(/not allowed/i);
  });

  it("rejects a non-JSON media type", async () => {
    await expect(
      readTrustedAuthJson(
        authRequest("email=admin", { "content-type": "text/plain" })
      )
    ).rejects.toMatchObject({ status: 415 });
  });

  it("rejects declared and streamed bodies over the hard limit", async () => {
    await expect(
      readTrustedAuthJson(authRequest("{}", { "content-length": "16385" }))
    ).rejects.toMatchObject({ status: 413 });

    await expect(
      readTrustedAuthJson(
        authRequest(JSON.stringify({ value: "x".repeat(17_000) }))
      )
    ).rejects.toMatchObject({ status: 413 });
  });

  it("rejects malformed UTF-8 or JSON", async () => {
    await expect(readTrustedAuthJson(authRequest("{"))).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      readTrustedAuthJson(authRequest(new Uint8Array([0xc3, 0x28])))
    ).rejects.toMatchObject({ status: 400 });
  });
});
