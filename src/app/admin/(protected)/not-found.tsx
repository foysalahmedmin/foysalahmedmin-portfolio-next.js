import { EmptyState } from "@/components/ui/async-state";
import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="p-6 lg:p-10">
      <EmptyState
        title="The requested record was not found"
        description="It may have been deleted, moved to trash, or removed by another administrator."
        action={
          <Link
            href="/admin"
            className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-md px-4 text-sm font-semibold"
          >
            Return to dashboard
          </Link>
        }
      />
    </main>
  );
}
