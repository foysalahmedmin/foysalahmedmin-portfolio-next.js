// @vitest-environment jsdom

import AuditLogWorkspace, {
  validateAuditDateRange,
} from "@/components/admin/audit-log-workspace";
import { getAdminAuditEvents } from "@/services/audit-admin.service";
import { getAdminPageCapability } from "@/lib/auth/capabilities";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/audit-admin.service", () => ({
  getAdminAuditEvents: vi.fn(),
}));

const event = {
  event_id: "evt_01J00000000000000000000000",
  schema_version: 1 as const,
  action: "content.published" as const,
  actor: {
    type: "user" as const,
    id: "507f1f77bcf86cd799439011",
    role: "admin" as const,
  },
  target: {
    type: "article" as const,
    id: "507f191e810c19729de860ea",
    revision: 3,
  },
  outcome: "success" as const,
  source: "admin" as const,
  summary_code: "article_published",
  changed_fields: ["status"],
  metadata: {},
  created_at: "2026-07-16T10:00:00.000Z",
  retain_until: "2027-07-16T10:00:00.000Z",
};

describe("audit log workspace", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/admin/audit");
    vi.mocked(getAdminAuditEvents).mockResolvedValue({
      status: 200,
      success: true,
      data: [event],
      meta: { page: 1, limit: 10, total: 1 },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders privacy-safe events and remote filter controls", async () => {
    render(<AuditLogWorkspace />);

    expect(await screen.findByText("content published")).toBeVisible();
    expect(screen.getByText("article published")).toBeVisible();
    expect(screen.getByText("Changed: status")).toBeVisible();
    expect(screen.queryByText(/session token/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Outcome" })).toBeVisible();
  });

  it("reloads the bounded query when an audit filter changes", async () => {
    const user = userEvent.setup();
    render(<AuditLogWorkspace />);
    await screen.findByText("content published");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Outcome" }),
      "failure"
    );

    expect(getAdminAuditEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ outcome: "failure" }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });
});

describe("audit date range", () => {
  it("rejects reversed and overlong windows", () => {
    expect(validateAuditDateRange("2026-07-16", "2026-07-01")).toMatch(
      /start date/i
    );
    expect(validateAuditDateRange("2026-01-01", "2026-07-16")).toMatch(
      /90-day/i
    );
    expect(validateAuditDateRange("2026-07-01", "2026-07-16")).toBeNull();
  });

  it("maps the admin page to the dedicated audit capability", () => {
    expect(getAdminPageCapability("/admin/audit")).toBe("audit:read");
    expect(getAdminPageCapability("/admin/audit/event")).toBe("audit:read");
  });
});
