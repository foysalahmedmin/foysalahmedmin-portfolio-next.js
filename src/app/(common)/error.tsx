"use client";

import { ErrorState } from "@/components/ui/async-state";
import { Container, Section } from "@/components/ui/layout";
import { NOINDEX_ROBOTS_CONTENT } from "@/lib/metadata/noindex";

export default function PublicRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <meta name="robots" content={NOINDEX_ROBOTS_CONTENT} />
      <Section>
        <Container measure="content">
          <ErrorState
            title="This page could not be loaded"
            description={
              error.digest
                ? `Please retry. If the problem continues, share reference ${error.digest} with support.`
                : "Please retry. If the problem continues, contact support with the page address."
            }
            onRetry={reset}
          />
        </Container>
      </Section>
    </main>
  );
}
