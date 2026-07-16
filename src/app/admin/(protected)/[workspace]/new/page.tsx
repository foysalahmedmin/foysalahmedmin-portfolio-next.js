import RepeatableRecordEditor from "@/components/admin/repeatable-record-editor";
import { getRepeatableAdminWorkspace } from "@/lib/admin/repeatable-workspaces";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { notFound } from "next/navigation";

type Props = Readonly<{ params: Promise<{ workspace: string }> }>;

const NewRepeatableRecordPage = async ({ params }: Props) => {
  const { workspace: workspaceKey } = await params;
  const workspace = getRepeatableAdminWorkspace(workspaceKey);
  if (!workspace) notFound();

  const session = await requireAdminSession(
    `/admin/${workspace.key}/new`,
    "content:edit"
  );

  return (
    <RepeatableRecordEditor
      workspace={workspace}
      actor={{ id: session.id, name: session.name }}
      canPublish={session.capabilities.includes("content:publish")}
    />
  );
};

export default NewRepeatableRecordPage;
