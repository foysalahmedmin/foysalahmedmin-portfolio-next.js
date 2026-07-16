import {
  clearPagePreviewCookie,
  PAGE_PREVIEW_COOKIE,
  setPagePreviewCookie,
  verifyPagePreviewCookie,
} from "@/app/api/pages/page.preview";
import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

describe("Page preview capability", () => {
  it("uses a short-lived scoped httpOnly cookie and no URL token", () => {
    const response = NextResponse.json({ ok: true });
    setPagePreviewCookie(
      response,
      {
        route_key: "home",
        page_id: "507f1f77bcf86cd799439011",
        revision: 4,
      },
      new Date("2026-07-15T00:00:00.000Z")
    );
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toContain(`${PAGE_PREVIEW_COOKIE}=`);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=strict");
    expect(header).toContain("Path=/api/pages/home/preview");
    expect(header).not.toContain("/api/pages/home/preview?");
  });

  it("verifies route/revision payload integrity and rejects route replay", () => {
    const issued = NextResponse.json({ ok: true });
    const now = new Date("2026-07-15T00:00:00.000Z");
    setPagePreviewCookie(
      issued,
      {
        route_key: "home",
        page_id: "507f1f77bcf86cd799439011",
        revision: 4,
      },
      now
    );
    const token = issued.cookies.get(PAGE_PREVIEW_COOKIE)?.value;
    const request = new NextRequest(
      "http://localhost:3000/api/pages/home/preview",
      {
        headers: { cookie: `${PAGE_PREVIEW_COOKIE}=${token}` },
      }
    );
    expect(verifyPagePreviewCookie(request, "home", now)).toMatchObject({
      route_key: "home",
      revision: 4,
    });
    expect(verifyPagePreviewCookie(request, "about", now)).toBeNull();
  });

  it("clears with the same narrow cookie scope", () => {
    const response = NextResponse.json({ ok: true });
    clearPagePreviewCookie(response, "terms");
    expect(response.headers.get("set-cookie")).toContain(
      "Path=/api/pages/terms/preview"
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
