import ReviewModerationWorkspace from "@/components/admin/review-moderation-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review Moderation | Portfolio Admin",
  robots: { index: false, follow: false },
};

const ReviewModerationPage = async () => {
  await requireAdminSession("/admin/reviews", "inbox:manage");
  return <ReviewModerationWorkspace />;
};

export default ReviewModerationPage;
