import {
  PAGE_ROUTE_SECTION_KINDS,
  parsePageDraftSnapshot,
} from "@/app/api/pages/page.validation";
import { PAGE_ROUTE_KEYS } from "@/app/api/pages/page.type";
import {
  createNeutralPageDraft,
  createPageEditorSection,
  PAGE_EDITOR_ROUTE_KINDS,
  PAGE_SECTION_EDITOR_DEFINITIONS,
} from "@/lib/admin/page-editor-contract";
import { getAdminPageClient } from "@/services/site-page-admin.service";
import type { EditorialRequestError } from "@/services/site-page-admin.service";
import { getAdminPageCapability } from "@/lib/auth/capabilities";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Site and Page admin editor contracts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps editor route choices identical to the server-owned route matrix", () => {
    expect(PAGE_EDITOR_ROUTE_KINDS).toEqual(PAGE_ROUTE_SECTION_KINDS);
    for (const routeKey of PAGE_ROUTE_KEYS) {
      expect(() =>
        parsePageDraftSnapshot(routeKey, createNeutralPageDraft(routeKey))
      ).not.toThrow();
    }
  });

  it("creates unique typed sections using only server-supported layouts", () => {
    const first = createPageEditorSection("home", "project-collection");
    const second = createPageEditorSection("home", "project-collection", [
      first,
    ]);
    expect(first.key).toBe("project-collection");
    expect(second.key).toBe("project-collection-2");
    expect(PAGE_SECTION_EDITOR_DEFINITIONS[first.kind].layouts).toContain(
      first.layout
    );
    expect(() =>
      parsePageDraftSnapshot("home", {
        seo: { noindex: false },
        sections: [first, second],
      })
    ).not.toThrow();
  });

  it("preserves redacted field sources and current revision from API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            status: 409,
            code: "PAGE_VERSION_CONFLICT",
            message: "The Page changed. Refresh it before saving again.",
            sources: [
              {
                path: "sections.1.source.ids",
                message: "This field is invalid, incomplete, or unavailable.",
              },
            ],
            current_revision: 7,
            request_id: "request-7",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(getAdminPageClient("home")).rejects.toMatchObject({
      name: "EditorialRequestError",
      code: "PAGE_VERSION_CONFLICT",
      currentRevision: 7,
      requestId: "request-7",
      sources: [expect.objectContaining({ path: "sections.1.source.ids" })],
    } satisfies Partial<EditorialRequestError>);
  });

  it("requires site:read before protected Site and Page workspaces render", () => {
    expect(getAdminPageCapability("/admin/site")).toBe("site:read");
    expect(getAdminPageCapability("/admin/pages")).toBe("site:read");
    expect(getAdminPageCapability("/admin/pages/home")).toBe("site:read");
  });
});
