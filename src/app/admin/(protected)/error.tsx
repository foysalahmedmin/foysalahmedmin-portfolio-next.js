"use client";

import { ErrorState } from "@/components/ui/async-state";

export default function AdminRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="p-6 lg:p-10">
      <ErrorState
        title="The workspace could not be loaded"
        description={
          error.digest
            ? `Retry before making another change. Support reference: ${error.digest}.`
            : "Retry before making another change. No operation has been reported as successful."
        }
        onRetry={reset}
      />
    </main>
  );
}
