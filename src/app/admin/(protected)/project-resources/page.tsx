import ProjectResourceWorkspace from "@/components/admin/project-resource-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Resources | Portfolio Admin",
  robots: { index: false, follow: false },
};

const ProjectResourcesPage = async () => {
  const session = await requireAdminSession(
    "/admin/project-resources",
    "content:read"
  );

  return (
    <ProjectResourceWorkspace
      canEdit={session.capabilities.includes("content:edit")}
      canPermanentDelete={session.capabilities.includes(
        "content:permanent-delete"
      )}
    />
  );
};

export default ProjectResourcesPage;
