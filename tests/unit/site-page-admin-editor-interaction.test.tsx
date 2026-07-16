// @vitest-environment jsdom

import type { TPageAdminDto } from "@/app/api/pages/page.type";
import type {
  TSiteAdminDto,
  TSiteDraftSnapshot,
} from "@/app/api/site/site.type";
import PageAdminEditor from "@/components/admin/page-admin-editor";
import SiteAdminEditor from "@/components/admin/site-admin-editor";
import {
  EditorialRequestError,
  createAdminPagePreviewClient,
  getAdminPagePreviewClient,
  updateAdminPageClient,
  updateAdminSiteClient,
} from "@/services/site-page-admin.service";
import type * as SitePageAdminServiceModule from "@/services/site-page-admin.service";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPublishableSiteDraft } from "../helpers/site-fixture";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/services/site-page-admin.service", async (importOriginal) => {
  const actual = await importOriginal<typeof SitePageAdminServiceModule>();
  return {
    ...actual,
    createAdminSiteClient: vi.fn(),
    getAdminSiteClient: vi.fn(),
    updateAdminSiteClient: vi.fn(),
    publishAdminSiteClient: vi.fn(),
    createAdminPageClient: vi.fn(),
    getAdminPageClient: vi.fn(),
    updateAdminPageClient: vi.fn(),
    publishAdminPageClient: vi.fn(),
    createAdminPagePreviewClient: vi.fn(),
    getAdminPagePreviewClient: vi.fn(),
    clearAdminPagePreviewClient: vi.fn().mockResolvedValue({ cleared: true }),
  };
});

const siteDto = (
  draft: TSiteDraftSnapshot = buildPublishableSiteDraft(),
  revision = 3
): TSiteAdminDto => ({
  site_key: "primary",
  schema_version: 1,
  contract_version: 1,
  revision,
  draft,
  published: null,
  updated_at: "2026-07-15T00:00:00.000Z",
});

const pageDto = (revision = 3): TPageAdminDto => ({
  id: "507f1f77bcf86cd799439099",
  route_key: "home",
  route_path: "/",
  locale: "en",
  schema_version: 1,
  contract_version: 1,
  revision,
  draft: {
    seo: { noindex: false },
    sections: [
      {
        key: "hero",
        kind: "site-hero",
        visible: true,
        layout: "default",
        source: { mode: "system" },
      },
      {
        key: "projects",
        kind: "project-collection",
        visible: true,
        layout: "grid",
        item_limit: 6,
        source: { mode: "automatic", filter: {} },
      },
    ],
  },
  published: null,
  updated_at: "2026-07-15T00:00:00.000Z",
});

describe("Site and Page admin editor interactions", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    vi.mocked(updateAdminSiteClient).mockReset();
    vi.mocked(updateAdminPageClient).mockReset();
    vi.mocked(createAdminPagePreviewClient).mockReset();
    vi.mocked(getAdminPagePreviewClient).mockReset();
  });

  afterEach(cleanup);

  it("edits and revision-saves Site identity without changing pillar invariants", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminSiteClient).mockImplementation(
      async (_revision, draft) => siteDto(draft, 4)
    );
    render(
      <SiteAdminEditor initialSite={siteDto()} canEdit canPublish={false} />
    );

    expect(screen.getByText("Exact five-pillar system")).toBeVisible();
    expect(screen.getAllByText("Immutable key")).toHaveLength(5);
    const publicName = screen.getByLabelText("Public name");
    await user.clear(publicName);
    await user.type(publicName, "Verified Portfolio Owner");
    expect(screen.getByText("Unsaved changes")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(updateAdminSiteClient).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          identity: expect.objectContaining({
            public_name: "Verified Portfolio Owner",
          }),
        })
      )
    );
    expect(await screen.findByText("Site draft saved.")).toBeVisible();
    expect(screen.getByText("Draft r4")).toBeVisible();
  });

  it("maps optimistic Site conflicts back to their validation source", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminSiteClient).mockRejectedValue(
      new EditorialRequestError({
        status: 409,
        code: "SITE_VERSION_CONFLICT",
        message: "The Site changed. Refresh it before saving again.",
        sources: [
          {
            path: "identity.public_name",
            message: "This field is invalid or unsupported.",
          },
        ],
        currentRevision: 8,
      })
    );
    render(
      <SiteAdminEditor initialSite={siteDto()} canEdit canPublish={false} />
    );
    const publicName = screen.getByLabelText("Public name");
    await user.clear(publicName);
    await user.type(publicName, "Changed owner");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByText(/newer revision \(r8\)/i)).toBeVisible();
    expect(
      screen.getByText("This field is invalid or unsupported.")
    ).toBeVisible();
    expect(publicName).toHaveAttribute("aria-invalid", "true");
  });

  it("supports keyboard-equivalent ordering, revision save and structural preview", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminPageClient).mockImplementation(
      async (_key, _revision, draft) => ({ ...pageDto(4), draft })
    );
    vi.mocked(createAdminPagePreviewClient).mockResolvedValue({
      expires_in_seconds: 600,
    });
    vi.mocked(getAdminPagePreviewClient).mockResolvedValue(pageDto(4));
    const { rerender } = render(
      <PageAdminEditor
        routeKey="home"
        initialPage={pageDto()}
        canEdit
        canPublish={false}
      />
    );

    await user.click(
      screen.getByRole("button", { name: "Move Site hero down" })
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(updateAdminPageClient).toHaveBeenCalledWith(
        "home",
        3,
        expect.objectContaining({
          sections: [
            expect.objectContaining({ key: "projects" }),
            expect.objectContaining({ key: "hero" }),
          ],
        })
      )
    );

    rerender(
      <PageAdminEditor
        routeKey="home"
        initialPage={pageDto(4)}
        canEdit
        canPublish={false}
      />
    );
    await user.click(
      screen.getByRole("button", { name: "Start secure preview" })
    );
    expect(await screen.findByText("Not a visual preview")).toBeVisible();
    expect(screen.getByText(/Renderer unavailable in admin/i)).toBeVisible();
    expect(createAdminPagePreviewClient).toHaveBeenCalledWith("home", 4);
    expect(getAdminPagePreviewClient).toHaveBeenCalledWith("home");
  });

  it("omits Page mutations for read-only capability state", () => {
    render(
      <PageAdminEditor
        routeKey="home"
        initialPage={pageDto()}
        canEdit={false}
        canPublish={false}
      />
    );
    expect(screen.getByText("Read-only Page access")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Save draft" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start secure preview" })
    ).toBeEnabled();
  });
});
