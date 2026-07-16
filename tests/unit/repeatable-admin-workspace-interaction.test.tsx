// @vitest-environment jsdom

import RepeatableContentWorkspace from "@/components/admin/repeatable-content-workspace";
import { REPEATABLE_ADMIN_WORKSPACES } from "@/lib/admin/repeatable-workspaces";
import {
  bulkMutateAdminRepeatableRecords,
  getAdminRepeatableRecords,
} from "@/services/repeatable-admin.service";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/repeatable-admin.service", () => ({
  getAdminRepeatableRecords: vi.fn(),
  bulkMutateAdminRepeatableRecords: vi.fn(),
  permanentlyDeleteAdminRepeatableRecord: vi.fn(),
}));

const records = [
  {
    id: "507f1f77bcf86cd799439011",
    slug: "api-design",
    locale: "en" as const,
    title: "API design",
    secondary_pillars: [],
    sequence: 1,
    status: "draft" as const,
    enabled: true,
    is_featured: false,
    claim_verification: "not_applicable" as const,
    version: 2,
    is_deleted: false,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-10T00:00:00.000Z",
    outcome: "Bounded interfaces",
    capabilities: ["API design"],
    deliverables: [],
    technologies: [],
  },
  {
    id: "507f191e810c19729de860ea",
    slug: "security-review",
    locale: "en" as const,
    title: "Security review",
    secondary_pillars: [],
    sequence: 2,
    status: "draft" as const,
    enabled: true,
    is_featured: false,
    claim_verification: "not_applicable" as const,
    version: 4,
    is_deleted: false,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-11T00:00:00.000Z",
    outcome: "Explicit risk boundaries",
    capabilities: ["Threat modeling"],
    deliverables: [],
    technologies: [],
  },
];

describe("repeatable admin workspace interactions", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/services");
    vi.mocked(getAdminRepeatableRecords).mockResolvedValue({
      status: 200,
      success: true,
      data: records,
      meta: { page: 1, limit: 10, total: 2 },
    });
    vi.mocked(bulkMutateAdminRepeatableRecords).mockResolvedValue({
      status: 200,
      success: true,
      data: {
        operation: "archive",
        succeeded: [{ id: records[0].id, version: 3 }],
        failed: [{ id: records[1].id, code: "VERSION_CONFLICT" }],
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("reports bulk partial failures and keeps failed records reviewable", async () => {
    const user = userEvent.setup();
    render(
      <RepeatableContentWorkspace
        workspace={REPEATABLE_ADMIN_WORKSPACES.services}
        canEdit
        canPublish
        canPermanentDelete={false}
      />
    );

    expect(await screen.findByText("API design")).toBeVisible();
    await user.click(
      screen.getByLabelText("Select all selectable rows on this page")
    );
    await user.click(screen.getByRole("button", { name: "Archive selected" }));

    expect(bulkMutateAdminRepeatableRecords).toHaveBeenCalledWith(
      "services",
      "archive",
      expect.arrayContaining([
        expect.objectContaining({ id: records[0].id, version: 2 }),
        expect.objectContaining({ id: records[1].id, version: 4 }),
      ])
    );
    expect(
      await screen.findByText(/1 archive operation succeeded; 1 failed/i)
    ).toBeVisible();
    expect(screen.getByText(/VERSION_CONFLICT/)).toBeVisible();
    expect(screen.getByText("1 row selected")).toBeVisible();
  });

  it("renders read-only capability state without mutation controls", async () => {
    render(
      <RepeatableContentWorkspace
        workspace={REPEATABLE_ADMIN_WORKSPACES.services}
        canEdit={false}
        canPublish={false}
        canPermanentDelete={false}
      />
    );

    expect(await screen.findByText("API design")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /new service/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Select all selectable rows on this page")
    ).not.toBeInTheDocument();
  });
});
