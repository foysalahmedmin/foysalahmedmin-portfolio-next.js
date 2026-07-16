import RepeatableContentWorkspace from "@/components/admin/repeatable-content-workspace";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getRepeatableAdminWorkspace } from "@/lib/admin/repeatable-workspaces";
import { notFound } from "next/navigation";

type Props = Readonly<{ params: Promise<{ workspace: string }> }>;

const RepeatableWorkspacePage = async ({ params }: Props) => {
  const { workspace: workspaceKey } = await params;
  const workspace = getRepeatableAdminWorkspace(workspaceKey);
  if (!workspace) notFound();

  const session = await requireAdminSession(
    `/admin/${workspace.key}`,
    "content:read"
  );

  return (
    <RepeatableContentWorkspace
      workspace={workspace}
      canEdit={session.capabilities.includes("content:edit")}
      canPublish={session.capabilities.includes("content:publish")}
      canPermanentDelete={session.capabilities.includes(
        "content:permanent-delete"
      )}
    />
  );
};

export default RepeatableWorkspacePage;
