// @vitest-environment jsdom

import ReviewModerationWorkspace from "@/components/admin/review-moderation-workspace";
import {
  getAdminReviewDetail,
  getAdminReviews,
  updateAdminReviewStatus,
  type ReviewModerationItem,
} from "@/services/review-admin.service";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/review-admin.service", () => ({
  REVIEW_MODERATION_STATUSES: ["pending", "approved", "rejected"],
  REVIEW_TARGET_MODELS: ["Project", "Article"],
  getAdminReviews: vi.fn(),
  getAdminReviewDetail: vi.fn(),
  updateAdminReviewStatus: vi.fn(),
}));

const review: ReviewModerationItem = {
  id: "507f1f77bcf86cd799439011",
  author: { id: "507f1f77bcf86cd799439012", name: "Ada Lovelace" },
  target: { id: "507f1f77bcf86cd799439013", name: "Event platform" },
  target_model: "Project",
  rating: 5,
  review: "Clear architecture and delivery boundaries.",
  status: "pending",
  is_edited: false,
  edited_at: null,
  created_at: "2026-07-15T00:00:00.000Z",
  updated_at: "2026-07-15T00:00:00.000Z",
  deleted: false,
};

const pageResponse = (data: ReviewModerationItem[], total = data.length) => ({
  success: true as const,
  status: 200,
  data,
  meta: { page: 1, limit: 25, total },
});

describe("review moderation workspace", () => {
  beforeEach(() => {
    vi.mocked(getAdminReviews).mockResolvedValue(pageResponse([review], 60));
    vi.mocked(getAdminReviewDetail).mockResolvedValue({
      success: true,
      status: 200,
      data: review,
    });
    vi.mocked(updateAdminReviewStatus).mockResolvedValue({
      success: true,
      status: 200,
      data: { ...review, status: "approved" },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.body.style.overflow = "";
  });

  it("opens safe detail, moderates all supported states, and clears on close", async () => {
    const user = userEvent.setup();
    render(<ReviewModerationWorkspace />);

    expect(await screen.findByText("Ada Lovelace")).toBeVisible();
    expect(screen.queryByText(/private@example.com/i)).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", {
      name: "Review moderation detail from Ada Lovelace",
    });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Event platform",
    });
    expect(within(dialog).getByText(review.review)).toBeVisible();
    expect(
      within(dialog).getByRole("option", { name: "Pending" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("option", { name: "Approved" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("option", { name: "Rejected" })
    ).toBeInTheDocument();

    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: "Change status" }),
      "approved"
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Update status" })
    );
    expect(updateAdminReviewStatus).toHaveBeenCalledWith(
      review.id,
      "approved",
      { signal: expect.any(AbortSignal) }
    );
    expect(
      await within(dialog).findByText("Review moved to Approved.")
    ).toBeVisible();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    let resolveDetail!: (value: {
      success: true;
      status: number;
      data: ReviewModerationItem;
    }) => void;
    vi.mocked(getAdminReviewDetail).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDetail = resolve;
      })
    );
    await user.click(trigger);
    const loadingDialog = await screen.findByRole("dialog", {
      name: "Review detail",
    });
    expect(
      within(loadingDialog).getByRole("status", {
        name: "Loading review detail",
      })
    ).toBeVisible();
    expect(
      within(loadingDialog).queryByText("Submitted review")
    ).not.toBeInTheDocument();
    resolveDetail({ success: true, status: 200, data: review });
  });

  it("wires search, status, target, and pagination to remote reads", async () => {
    const user = userEvent.setup();
    render(<ReviewModerationWorkspace />);
    expect(await screen.findByText("Ada Lovelace")).toBeVisible();
    vi.mocked(getAdminReviews).mockClear();

    await user.type(
      screen.getByRole("searchbox", { name: "Search table" }),
      "system"
    );
    await waitFor(
      () =>
        expect(getAdminReviews).toHaveBeenCalledWith(
          expect.objectContaining({ search: "system" }),
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        ),
      { timeout: 1_500 }
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Moderation status" }),
      "approved"
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Target type" }),
      "Article"
    );
    await waitFor(() =>
      expect(getAdminReviews).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: "system",
          status: "approved",
          target_model: "Article",
          page: 1,
        }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );

    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    await waitFor(() =>
      expect(getAdminReviews).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    );
  });

  it("announces loading and renders an honest empty queue", async () => {
    let resolveList!: (value: ReturnType<typeof pageResponse>) => void;
    vi.mocked(getAdminReviews).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve;
      })
    );
    render(<ReviewModerationWorkspace />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading table");
    resolveList(pageResponse([]));
    expect(await screen.findByText("No reviews found")).toBeVisible();
  });

  it("renders a retryable queue error", async () => {
    const user = userEvent.setup();
    vi.mocked(getAdminReviews)
      .mockRejectedValueOnce(new Error("Moderation queue unavailable"))
      .mockResolvedValueOnce(pageResponse([]));
    render(<ReviewModerationWorkspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Moderation queue unavailable"
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No reviews found")).toBeVisible();
    expect(getAdminReviews).toHaveBeenCalledTimes(2);
  });
});
