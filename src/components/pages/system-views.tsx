"use client";

import { SystemPage } from "@/components/templates/system-page";
import { Button } from "@/components/ui/button";
import { NOINDEX_ROBOTS_CONTENT } from "@/lib/metadata/noindex";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

/** A8 System: not found. Shared by the root boundary and the public segment boundary. */
export function NotFoundView({ fullHeight }: { fullHeight?: boolean }) {
  return (
    <SystemPage
      {...(fullHeight ? { className: "min-h-dvh" } : {})}
      code="404 · Not found"
      title="This work is not available."
      description="The address may be outdated, or this content may no longer be published."
      actions={
        <Button asChild size="lg">
          <Link href="/">Return home</Link>
        </Button>
      }
    />
  );
}

/** A8 System: a route threw. Names what happened and what to do; the digest is the support reference. */
export function RouteErrorView({
  error,
  reset,
  title = "This page could not be loaded",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}) {
  return (
    <>
      <meta name="robots" content={NOINDEX_ROBOTS_CONTENT} />
      <SystemPage
        code="Error"
        title={title}
        description={
          error.digest
            ? `Retry now. If it continues, contact support with reference ${error.digest}.`
            : "Retry now. If it continues, contact support with the page address."
        }
        actions={
          <Button type="button" size="lg" onClick={reset}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        }
      />
    </>
  );
}
