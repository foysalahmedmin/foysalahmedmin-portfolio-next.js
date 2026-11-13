"use client";

import { ErrorState } from "@/components/ui/async-state";
import { Container, Section } from "@/components/ui/layout";
import { NOINDEX_ROBOTS_CONTENT } from "@/lib/metadata/noindex";

// The error and its digest are never shown to a visitor (docs plan 4.2)
export default function RootError({ reset }: { reset: () => void }) {
  return (
    <main>
      <meta name="robots" content={NOINDEX_ROBOTS_CONTENT} />
      <Section>
        <Container measure="content">
          <ErrorState
            title="Something interrupted this page"
            description="Retry now or contact support if the issue continues."
            onRetry={reset}
          />
        </Container>
      </Section>
    </main>
  );
}
