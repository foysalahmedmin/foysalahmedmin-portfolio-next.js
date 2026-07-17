import {
  clearPagePreviewCookie,
  PAGE_PREVIEW_COOKIE,
  setPagePreviewCookie,
  verifyPagePreviewToken,
} from "@/app/api/pages/page.preview";
import { NextResponse } from "next/server";
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
    expect(header).toContain("Path=/admin/preview/pages/home");
    expect(header).toContain("Expires=Wed, 15 Jul 2026 00:10:00 GMT");
    expect(header).not.toContain("/admin/preview/pages/home?");
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
    expect(verifyPagePreviewToken(token, "home", now)).toMatchObject({
      route_key: "home",
      revision: 4,
    });
    expect(verifyPagePreviewToken(token, "about", now)).toBeNull();
  });

  it("clears with the same narrow cookie scope", () => {
    const response = NextResponse.json({ ok: true });
    clearPagePreviewCookie(response, "terms");
    expect(response.headers.get("set-cookie")).toContain(
      "Path=/admin/preview/pages/terms"
    );
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
