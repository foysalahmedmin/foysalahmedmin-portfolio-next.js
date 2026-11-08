"use client";

import { RouteErrorView } from "@/components/pages/system-views";

export default function PublicRouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorView reset={reset} />;
}
