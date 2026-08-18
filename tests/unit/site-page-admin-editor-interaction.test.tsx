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
  updateAdminPageClient,
  updateAdminSiteClient,
} from "@/services/site-page-admin.service";
import type * as SitePageAdminServiceModule from "@/services/site-page-admin.service";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
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
    clearAdminPagePreviewClient: vi.fn().mockResolvedValue({ cleared: true }),
    clearAdminPagePreviewBestEffort: vi.fn(),
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

    expect(screen.getByText("Exact six-pillar system")).toBeVisible();
    expect(screen.getAllByText("Immutable key")).toHaveLength(
      PILLAR_CONTRACT.length
    );
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

  it("adds, types, reorders and revision-saves embedded Process steps", async () => {
    const user = userEvent.setup();
    const initialDraft = buildPublishableSiteDraft();
    initialDraft.process = [
      {
        key: "delivery",
        title: "Delivery",
        summary: "Ship in reviewable increments.",
        deliverable: "Tested release",
        enabled: true,
      },
    ];
    vi.mocked(updateAdminSiteClient).mockImplementation(
      async (_revision, draft) => siteDto(draft, 4)
    );
    render(
      <SiteAdminEditor
        initialSite={siteDto(initialDraft)}
        canEdit
        canPublish={false}
      />
    );

    const processPanel = screen.getByRole("region", {
      name: "Embedded delivery process",
    });
    await user.click(
      within(processPanel).getByRole("button", { name: "Add process step" })
    );
    const titles = within(processPanel).getAllByLabelText(/Step title/);
    const summaries = within(processPanel).getAllByLabelText("Step summary");
    const deliverables = within(processPanel).getAllByLabelText(
      "Concrete deliverable"
    );
    await user.type(titles[1]!, "Discovery");
    await user.type(summaries[1]!, "Align the problem and constraints.");
    await user.type(deliverables[1]!, "Reviewed delivery brief");
    await user.click(
      within(processPanel).getAllByRole("checkbox", {
        name: /Include in published process/,
      })[1]!
    );
    await user.click(
      within(processPanel).getByRole("button", { name: "Move Discovery up" })
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(updateAdminSiteClient).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          process: [
            expect.objectContaining({
              key: "process-step-2",
              title: "Discovery",
              enabled: true,
            }),
            expect.objectContaining({ key: "delivery" }),
          ],
        })
      )
    );
    expect(await screen.findByText("Site draft saved.")).toBeVisible();
  });

  it("supports keyboard-equivalent ordering, revision save and public-renderer preview", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminPageClient).mockImplementation(
      async (_key, _revision, draft) => ({ ...pageDto(4), draft })
    );
    vi.mocked(createAdminPagePreviewClient).mockResolvedValue({
      expires_in_seconds: 600,
      expires_at: new Date(Date.now() + 600_000).toISOString(),
    });
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
    expect(await screen.findByText("Renderer parity")).toBeVisible();
    const previewFrame = screen.getByTitle("home Page public renderer preview");
    expect(previewFrame).toHaveAttribute(
      "src",
      "/admin/preview/pages/home?theme=light&motion=normal"
    );
    expect(previewFrame).toHaveAttribute("sandbox", "allow-scripts");
    expect(previewFrame.getAttribute("sandbox")).not.toContain(
      "allow-same-origin"
    );
    expect(createAdminPagePreviewClient).toHaveBeenCalledWith("home", 4);

    await user.click(screen.getByRole("button", { name: "Mobile · 390px" }));
    await user.click(screen.getByRole("button", { name: "Dark" }));
    await user.click(screen.getByRole("button", { name: "Reduced motion" }));
    expect(
      screen.getByTitle("home Page public renderer preview")
    ).toHaveAttribute("width", "390");
    expect(
      screen.getByTitle("home Page public renderer preview")
    ).toHaveAttribute(
      "src",
      "/admin/preview/pages/home?theme=dark&motion=reduced"
    );
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
