// @vitest-environment jsdom

import ContactInboxWorkspace from "@/components/admin/contact-inbox-workspace";
import {
  getAdminContactDetail,
  getAdminContacts,
  updateAdminContactStatus,
  type ContactInboxDetail,
  type ContactInboxListItem,
} from "@/services/contact-admin.service";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/contact-admin.service", () => ({
  getAdminContacts: vi.fn(),
  getAdminContactDetail: vi.fn(),
  updateAdminContactStatus: vi.fn(),
}));

const retention = {
  expires_at: "2027-07-15T00:00:00.000Z",
  anonymized_at: null,
  purge_after: null,
  hold: { active: false as const },
};

const operations = {
  idempotency: { active: true, expires_at: "2026-07-16T00:00:00.000Z" },
  delivery: {
    event_id: "507f1f77bcf86cd799439012",
    status: "delivered" as const,
    attempts: 1,
    next_attempt_at: "2026-07-15T00:01:00.000Z",
    last_error_code: null,
    delivered_at: "2026-07-15T00:01:00.000Z",
    dead_lettered_at: null,
    retryable: false,
  },
};

const listItem: ContactInboxListItem = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  subject: "Architecture review",
  email_masked: "ad***@example.com",
  status: "new",
  delivery_status: "delivered",
  revision: 4,
  status_changed_at: "2026-07-15T00:00:00.000Z",
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
  deleted: false,
  deleted_at: null,
  retention,
  operations,
};

const detail: ContactInboxDetail = {
  ...listItem,
  email: "ada@example.com",
  message: "Please review the security boundaries of our event platform.",
  allowed_statuses: ["read", "qualified", "spam", "archived"],
};
delete (detail as Partial<ContactInboxListItem>).email_masked;

const listResponse = (data: ContactInboxListItem[]) => ({
  success: true as const,
  status: 200,
  data,
  meta: { page: 1, limit: 25, total: data.length, total_pages: 1 },
});

describe("contact inbox workspace", () => {
  beforeEach(() => {
    vi.mocked(getAdminContacts).mockResolvedValue(listResponse([listItem]));
    vi.mocked(getAdminContactDetail).mockResolvedValue({
      success: true,
      status: 200,
      data: detail,
    });
    vi.mocked(updateAdminContactStatus).mockResolvedValue({
      success: true,
      status: 200,
      data: {
        ...detail,
        status: "read",
        revision: 5,
        allowed_statuses: ["replied", "qualified", "spam", "archived"],
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("keeps list PII redacted, loads detail on demand, and applies an allowed transition", async () => {
    const user = userEvent.setup();
    render(<ContactInboxWorkspace />);

    expect(await screen.findByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByText("ad***@example.com")).toBeVisible();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText(detail.message)).not.toBeInTheDocument();
    expect(getAdminContactDetail).not.toHaveBeenCalled();

    const trigger = screen.getByRole("button", {
      name: "View inquiry from Ada Lovelace",
    });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Architecture review",
    });
    expect(within(dialog).getByText("ada@example.com")).toBeVisible();
    expect(within(dialog).getByText(detail.message)).toBeVisible();
    expect(
      within(dialog).queryByRole("option", { name: "Replied" })
    ).not.toBeInTheDocument();

    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Change status" }),
      "read"
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Update status" })
    );
    expect(updateAdminContactStatus).toHaveBeenCalledWith(
      listItem.id,
      { status: "read", expected_revision: 4 },
      { signal: expect.any(AbortSignal) }
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "Update status" })
      ).toBeDisabled()
    );

    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText(detail.message)).not.toBeInTheDocument();
  });

  it("announces loading and renders an honest empty inbox", async () => {
    let resolveList!: (value: ReturnType<typeof listResponse>) => void;
    vi.mocked(getAdminContacts).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve;
      })
    );
    render(<ContactInboxWorkspace />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading table");
    resolveList(listResponse([]));
    expect(await screen.findByText("No inquiries found")).toBeVisible();
  });

  it("renders a retryable list error", async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminContacts)
      .mockRejectedValueOnce(new Error("Inbox temporarily unavailable"))
      .mockResolvedValueOnce(listResponse([]));
    render(<ContactInboxWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Inbox temporarily unavailable"
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No inquiries found")).toBeVisible();
    expect(getAdminContacts).toHaveBeenCalledTimes(2);
  });
});
