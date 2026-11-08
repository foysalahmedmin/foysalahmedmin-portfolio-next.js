import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { scanDesignRules } from "../helpers/source-scan";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { createNeutralSiteDraft } from "@/app/api/site/site.policy";
import type { TSiteAdminDto } from "@/app/api/site/site.type";
import { SiteReview } from "@/components/admin/site-review/site-review";

const siteWith = (
  edit: (draft: ReturnType<typeof createNeutralSiteDraft>) => void,
  published = true
): TSiteAdminDto => {
  const base = createNeutralSiteDraft();
  const draft = structuredClone(base);
  edit(draft);
  return {
    site_key: "primary",
    schema_version: 1,
    contract_version: 1,
    revision: 13,
    draft,
    published: published
      ? {
          ...structuredClone(base),
          revision: 12,
          published_at: "2026-11-01T04:00:00.000Z",
          published_by: "507f1f77bcf86cd799439011",
        }
      : null,
    updated_at: "2026-11-08T04:00:00.000Z",
  };
};

const render = (site: TSiteAdminDto | null, canPublish = true) =>
  renderToStaticMarkup(<SiteReview site={site} canPublish={canPublish} />);

describe("SiteReview", () => {
  it("groups the changed fields by section with was and now as plain text", () => {
    const html = render(
      siteWith((draft) => {
        draft.identity.public_name = "New Name";
        draft.contact.location = "Dhaka";
        draft.navigation.header = [
          {
            key: "work",
            label: "Work",
            kind: "internal",
            href: "/work",
            enabled: true,
          },
        ];
      })
    );
    expect(html).toContain("Review and publish");
    expect(html).toContain("Draft r13");
    expect(html).toContain("Published r12");
    expect(html).toContain("3 changes");
    for (const section of ["identity", "contact", "navigation"]) {
      expect(html).toContain(`data-testid="cd-review-${section}"`);
    }
    expect(html).not.toContain('data-testid="cd-review-seo"');
    expect(html).toContain("Public name");
    expect(html).toContain("New Name");
    expect(html).toContain("Not set");
    expect(html).toContain("Added");
    // Order of the groups follows the Site editor, not the order of editing.
    expect(html.indexOf("cd-review-identity")).toBeLessThan(
      html.indexOf("cd-review-contact")
    );
    expect(html).toContain(
      "3 fields differ between draft r13 and published r12"
    );
  });

  it("says Not published yet and lists nothing as changed without a published snapshot", () => {
    const html = render(
      siteWith((draft) => {
        draft.identity.public_name = "Only a draft";
      }, false)
    );
    expect(html).toContain("Not published yet");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Only a draft");
    expect(html).toContain("no change is listed");
    // The first publication is still possible.
    expect(html).toContain("Publish revision r13");
  });

  it("says so when the draft equals the published snapshot", () => {
    const html = render(siteWith(() => {}));
    expect(html).toContain("no field differences");
    expect(html).not.toContain("<table");
  });

  it("offers the publish action only with site:publish", () => {
    const site = siteWith((draft) => {
      draft.identity.public_name = "N";
    });
    expect(render(site, true)).toContain("Publish revision r13");
    const readOnly = render(site, false);
    expect(readOnly).not.toContain("Publish revision");
    expect(readOnly).toContain("review the draft but not publish it");
  });

  it("handles a Site that does not exist yet", () => {
    const html = render(null);
    expect(html).toContain("Site not configured");
    expect(html).toContain('href="/admin/site"');
    expect(html).not.toContain("Publish revision");
  });

  it("truncates long values safely in the page", () => {
    const html = render(
      siteWith((draft) => {
        draft.positioning.long = "z".repeat(3_000);
      })
    );
    expect(html).toContain("…");
    expect(html).not.toContain("z".repeat(200));
  });

  it("escapes values instead of rendering them as markup", () => {
    const html = render(
      siteWith((draft) => {
        draft.identity.public_name = '<img src=x onerror="alert(1)">';
      })
    );
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("carries no colour class, palette utility or state colour", () => {
    const html = render(
      siteWith((draft) => {
        draft.identity.public_name = "N";
      })
    );
    expect(scanDesignRules(html)).toEqual({});
    expect(html).not.toMatch(
      /\b(?:bg|text|border|ring|fill|stroke)-(?:primary|success|warning|destructive|info|muted|accent)\b/
    );
  });
});
