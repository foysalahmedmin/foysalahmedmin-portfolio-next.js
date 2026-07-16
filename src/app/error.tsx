"use client";

import { ErrorState } from "@/components/ui/async-state";
import { Container, Section } from "@/components/ui/layout";
import { NOINDEX_ROBOTS_CONTENT } from "@/lib/metadata/noindex";

export default function RootError({
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
            title="Something interrupted this page"
            description={
              error.digest
                ? `Retry now or contact support with reference ${error.digest}.`
                : "Retry now or contact support if the issue continues."
            }
            onRetry={reset}
          />
        </Container>
      </Section>
    </main>
  );
}
