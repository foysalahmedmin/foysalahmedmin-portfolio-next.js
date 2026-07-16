import RepeatableRecordEditor from "@/components/admin/repeatable-record-editor";
import { getRepeatableAdminWorkspace } from "@/lib/admin/repeatable-workspaces";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { notFound } from "next/navigation";

type Props = Readonly<{
  params: Promise<{ workspace: string; id: string }>;
}>;

const EditRepeatableRecordPage = async ({ params }: Props) => {
  const { workspace: workspaceKey, id } = await params;
  const workspace = getRepeatableAdminWorkspace(workspaceKey);
  if (!workspace || !/^[0-9a-f]{24}$/i.test(id)) notFound();

  const session = await requireAdminSession(
    `/admin/${workspace.key}/edit/${id}`,
    "content:edit"
  );

  return (
    <RepeatableRecordEditor
      workspace={workspace}
      recordId={id}
      actor={{ id: session.id, name: session.name }}
      canPublish={session.capabilities.includes("content:publish")}
    />
  );
};

export default EditRepeatableRecordPage;
