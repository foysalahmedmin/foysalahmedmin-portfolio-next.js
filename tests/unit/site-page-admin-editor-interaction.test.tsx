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
  publishAdminSiteClient,
  updateAdminPageClient,
  updateAdminSiteClient,
} from "@/services/site-page-admin.service";
import type * as SitePageAdminServiceModule from "@/services/site-page-admin.service";
import {
  cleanup,
  fireEvent,
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
    vi.mocked(publishAdminSiteClient).mockReset();
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

    expect(screen.getByText("Core roles")).toBeVisible();
    expect(screen.getAllByText("Immutable key")).toHaveLength(
      PILLAR_CONTRACT.length
    );
    const publicName = screen.getByLabelText("Public name");
    await user.clear(publicName);
    await user.type(publicName, "Verified Portfolio Owner");
    expect(screen.getByText("1 unsaved change")).toBeVisible();
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
    expect(screen.getByText("r4")).toBeVisible();
    expect(screen.getByText("No unsaved changes")).toBeVisible();
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

  it("starts the engagement and home-proof editors empty for a snapshot that predates them", async () => {
    const user = userEvent.setup();
    const legacy: Partial<TSiteDraftSnapshot> = buildPublishableSiteDraft();
    for (const key of [
      "engagement_models",
      "commitments",
      "deliverable_samples",
      "next_steps",
      "principles",
      "fit",
      "finder",
      "workflow_example",
    ] as const) {
      delete legacy[key];
    }
    vi.mocked(updateAdminSiteClient).mockImplementation(
      async (_revision, draft) => siteDto(draft, 4)
    );
    render(
      <SiteAdminEditor
        initialSite={siteDto(legacy as TSiteDraftSnapshot)}
        canEdit
        canPublish={false}
      />
    );

    expect(screen.getByText("No unsaved changes")).toBeVisible();
    expect(screen.getByText(/No engagement models configured/)).toBeVisible();
    expect(screen.getByLabelText("Workflow example")).toHaveValue("");
    expect(
      JSON.parse(
        (screen.getByLabelText("Fit check") as HTMLTextAreaElement).value
      )
    ).toEqual({ enabled: false, segments: [], not_a_fit: [] });

    await user.type(
      screen.getByLabelText("Page headline"),
      "Systems that ship"
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(updateAdminSiteClient).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          positioning: expect.objectContaining({
            headline: "Systems that ship",
          }),
          engagement_models: [],
          commitments: [],
          deliverable_samples: [],
          next_steps: [],
          principles: [],
          fit: { enabled: false, segments: [], not_a_fit: [] },
          finder: { enabled: false, steps: [], outcomes: [] },
        })
      )
    );
  });

  it("adds an engagement model and saves it in the payload", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminSiteClient).mockImplementation(
      async (_revision, draft) => siteDto(draft, 4)
    );
    render(
      <SiteAdminEditor initialSite={siteDto()} canEdit canPublish={false} />
    );

    const panel = screen.getByRole("region", { name: "Engagement models" });
    await user.click(
      within(panel).getByRole("button", { name: "Add engagement model" })
    );
    await user.type(within(panel).getByLabelText(/Model name/), "Sprint");
    await user.type(
      within(panel).getByLabelText("You get"),
      "Design document{Enter}Runbook"
    );
    await user.selectOptions(
      within(panel).getByLabelText("Verification"),
      "verified"
    );
    await user.type(within(panel).getByLabelText("Price label"), "From $4k");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() =>
      expect(updateAdminSiteClient).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          engagement_models: [
            {
              key: "engagement-model-1",
              name: "Sprint",
              you_get: ["Design document", "Runbook"],
              price_label: "From $4k",
              verification: "verified",
              enabled: false,
            },
          ],
        })
      )
    );
  });

  it("blocks saving while a JSON editor holds invalid text and clears a removed workflow example", async () => {
    const user = userEvent.setup();
    const draft = buildPublishableSiteDraft();
    draft.workflow_example = {
      title: "Intake flow",
      caption: "How a request moves.",
      illustrative: true,
      nodes: [
        {
          key: "in",
          kind: "input",
          label: "Request",
          summary: "A request arrives.",
        },
        {
          key: "out",
          kind: "output",
          label: "Answer",
          summary: "A reply is sent.",
        },
      ],
    };
    vi.mocked(updateAdminSiteClient).mockImplementation(
      async (_revision, next) => siteDto(next, 4)
    );
    render(
      <SiteAdminEditor
        initialSite={siteDto(draft)}
        canEdit
        canPublish={false}
      />
    );

    const fit = screen.getByLabelText("Fit check");
    fireEvent.change(fit, { target: { value: "{ not json" } });
    await waitFor(() =>
      expect(document.getElementById("fit-error")).toHaveTextContent(
        /Invalid JSON/
      )
    );
    expect(fit).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(fit, {
      target: { value: '{"enabled":"yes","segments":[],"not_a_fit":[]}' },
    });
    await waitFor(() =>
      expect(document.getElementById("fit-error")).toHaveTextContent(
        /enabled: /
      )
    );

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      await screen.findByText("Fix the JSON editors before saving.")
    ).toBeVisible();
    expect(updateAdminSiteClient).not.toHaveBeenCalled();

    fireEvent.change(fit, {
      target: {
        value:
          '{"enabled":false,"segments":[],"not_a_fit":["Fixed-scope bids"]}',
      },
    });
    fireEvent.change(screen.getByLabelText("Workflow example"), {
      target: { value: "" },
    });
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(updateAdminSiteClient).toHaveBeenCalledTimes(1));
    const saved = vi.mocked(updateAdminSiteClient).mock.calls[0]![1];
    expect(saved.workflow_example).toBeUndefined();
    expect(saved.fit.not_a_fit).toEqual(["Fixed-scope bids"]);
  });

  it("shows a publish issue next to the engagement model it names", async () => {
    const user = userEvent.setup();
    const draft = buildPublishableSiteDraft();
    const model = {
      you_get: ["A written plan"],
      best_when: "The scope is unclear.",
      how_it_runs: "Weekly reviews.",
      enabled: true,
    };
    draft.engagement_models = [
      { ...model, key: "audit", name: "Audit", verification: "verified" },
      { ...model, key: "build", name: "Build", verification: "unverified" },
    ];
    vi.mocked(publishAdminSiteClient).mockRejectedValue(
      new EditorialRequestError({
        status: 422,
        code: "SITE_PUBLISH_INVALID",
        message: "The Site is not ready to publish.",
        sources: [
          {
            path: "engagement_models.1.verification",
            message: "This field is invalid or unsupported.",
          },
        ],
      })
    );
    render(<SiteAdminEditor initialSite={siteDto(draft)} canEdit canPublish />);

    await user.click(screen.getByRole("button", { name: "Publish revision" }));

    const second = await screen.findByRole("group", { name: /Model 02/ });
    expect(
      within(second).getByText("This field is invalid or unsupported.")
    ).toBeVisible();
    expect(within(second).getByLabelText("Verification")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    const first = screen.getByRole("group", { name: /Model 01/ });
    expect(
      within(first).queryByText("This field is invalid or unsupported.")
    ).not.toBeInTheDocument();
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

  it("gives the Site editor the console anatomy: header, section index and the action bar", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SiteAdminEditor initialSite={siteDto()} canEdit canPublish />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Site settings" })
    ).toBeVisible();
    expect(screen.getByText("Never published")).toBeVisible();
    const index = screen.getByRole("navigation", { name: "Sections" });
    expect(
      within(index).getByRole("link", { name: "Structured data" })
    ).toHaveAttribute("href", "#site-structured");
    for (const link of within(index).getAllByRole("link")) {
      const id = link.getAttribute("href")!.slice(1);
      expect(container.querySelector(`section[id="${id}"]`)).not.toBeNull();
    }

    const bar = screen.getByRole("group", { name: "Editor actions" });
    expect(within(bar).getByText("No unsaved changes")).toBeVisible();
    await user.type(screen.getByLabelText("Public name"), " Two");
    expect(within(bar).getByText("1 unsaved change")).toBeVisible();
    expect(
      within(index).getByRole("link", { name: /Identity/ })
    ).toHaveTextContent("Edited");
    expect(
      within(bar).getByRole("button", { name: "Save draft" })
    ).toBeEnabled();
    expect(
      within(bar).getByRole("button", { name: "Save before publishing" })
    ).toBeDisabled();
    expect(container.innerHTML).not.toMatch(
      /\b(?:bg|text|border)-(?:red|green|emerald|amber|yellow|blue)-\d/
    );
  });

  it("saves the Site draft with Cmd/Ctrl+S only when the Save draft button would be enabled", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminSiteClient).mockImplementation(
      async (_revision, draft) => siteDto(draft, 4)
    );
    render(
      <SiteAdminEditor initialSite={siteDto()} canEdit canPublish={false} />
    );

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(updateAdminSiteClient).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Public name"), " Two");
    fireEvent.keyDown(window, { key: "s", metaKey: true });
    await waitFor(() => expect(updateAdminSiteClient).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Site draft saved.")).toBeVisible();
  });

  it("marks the Page index and header, and lists a validation problem as a jump link", async () => {
    const user = userEvent.setup();
    vi.mocked(updateAdminPageClient).mockRejectedValue(
      new EditorialRequestError({
        status: 422,
        code: "PAGE_DRAFT_INVALID",
        message: "The Page draft is invalid.",
        sources: [
          {
            path: "sections.1.key",
            message: "This field is invalid or unsupported.",
          },
        ],
      })
    );
    render(
      <PageAdminEditor
        routeKey="home"
        initialPage={pageDto()}
        canEdit
        canPublish={false}
      />
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "home Page" })
    ).toBeVisible();
    expect(screen.getByText("Never published")).toBeVisible();
    const index = screen.getByRole("navigation", { name: "Sections" });
    expect(
      within(index)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"))
    ).toEqual([
      "#page-seo",
      "#page-composition",
      "#page-section-0",
      "#page-section-1",
    ]);

    await user.type(
      screen.getByLabelText("Stable section key", {
        selector: "[id='sections.1.key']",
      }),
      "x"
    );
    expect(
      within(screen.getByRole("group", { name: "Editor actions" })).getByText(
        "1 unsaved change"
      )
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    const summary = await screen.findByText("1 problem to fix");
    const link = within(
      summary.closest("[role=alert]") as HTMLElement
    ).getByRole("link");
    expect(link).toHaveAttribute("href", "#sections.1.key");
    expect(
      within(index).getByRole("link", { name: /2\. Projects/ })
    ).toHaveTextContent("Error");
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
