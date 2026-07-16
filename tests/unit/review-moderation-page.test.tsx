import ReviewModerationPage from "@/app/admin/(protected)/reviews/page";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getAdminPageCapability } from "@/lib/auth/capabilities";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/admin-session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({
    id: "507f1f77bcf86cd799439011",
    capabilities: ["inbox:manage"],
  }),
}));

vi.mock("@/components/admin/review-moderation-workspace", () => ({
  default: () => <div>Moderation workspace</div>,
}));

describe("review moderation admin page", () => {
  it("requires the inbox capability before returning the workspace", async () => {
    const page = await ReviewModerationPage();

    expect(requireAdminSession).toHaveBeenCalledWith(
      "/admin/reviews",
      "inbox:manage"
    );
    expect(getAdminPageCapability("/admin/reviews")).toBe("inbox:manage");
    expect(page.type).toBeTypeOf("function");
  });
});
