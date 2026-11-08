// @vitest-environment jsdom

import AuditLogWorkspace, {
  validateAuditDateRange,
} from "@/components/admin/audit-log-workspace";
import { getAdminAuditEvents } from "@/services/audit-admin.service";
import { getAdminPageCapability } from "@/lib/auth/capabilities";
import { cleanup, render, screen, within } from "@testing-library/react";
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

  it("is a C2 list: header, a bounded date-window toolbar, and the table with its marks", async () => {
    const { container } = render(<AuditLogWorkspace />);
    await screen.findByText("content published");

    expect(container.firstElementChild).toHaveAttribute("data-archetype", "C2");
    expect(
      screen.getByRole("heading", { level: 1, name: "Audit log" })
    ).toBeVisible();
    expect(screen.getByText("Governance")).toBeVisible();
    const toolbar = screen.getByRole("group", { name: "Bounded date window" });
    expect(within(toolbar).getByLabelText("From")).toBeVisible();
    expect(within(toolbar).getByLabelText("To")).toBeVisible();
    // the outcome is a status mark with a text label, not a coloured pill
    const outcome = screen.getByText("success").closest(".status-mark");
    expect(outcome).toHaveAttribute("data-glyph", "success");
  });

  it("shows the empty state, and a filtered-empty state with a clear action", async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminAuditEvents).mockResolvedValue({
      status: 200,
      success: true,
      data: [],
      meta: { page: 1, limit: 10, total: 0 },
    });
    const { unmount } = render(<AuditLogWorkspace />);
    expect(
      await screen.findByText("No audit events in this window")
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Clear filters" })
    ).not.toBeInTheDocument();
    unmount();

    window.history.replaceState({}, "", "/admin/audit?outcome=failure");
    render(<AuditLogWorkspace />);
    expect(
      await screen.findByText("No audit events match these filters")
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      await screen.findByText("No audit events in this window")
    ).toBeVisible();
    expect(getAdminAuditEvents).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ outcome: "failure" }),
      expect.anything()
    );
  });

  it("announces a rejected date window and keeps the table empty", async () => {
    const user = userEvent.setup();
    render(<AuditLogWorkspace />);
    await screen.findByText("content published");
    const from = screen.getByLabelText("From");
    await user.clear(from);
    await user.type(from, "2020-01-01");
    expect(await screen.findByRole("alert")).toHaveTextContent(/90-day/);
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
