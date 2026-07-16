import { Skeleton } from "@/components/ui/async-state";
import { Container, Section, Stack } from "@/components/ui/layout";

export function PublicPageSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading page">
      <Section>
        <Container>
          <Stack gap="lg">
            <div className="max-w-3xl space-y-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full max-w-2xl md:h-24" />
              <Skeleton className="h-6 w-full max-w-xl" />
            </div>
            <Skeleton className="aspect-[16/7] w-full rounded-[var(--radius-xl-token)]" />
            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-[4/3] rounded-[var(--radius-lg-token)]"
                />
              ))}
            </div>
          </Stack>
        </Container>
      </Section>
      <span className="sr-only" role="status">
        Loading content…
      </span>
    </main>
  );
}

export function SectionSkeleton({ label }: { label: string }) {
  return (
    <section
      aria-busy="true"
      aria-label={`Loading ${label}`}
      className="py-[var(--space-section-compact)]"
    >
      <Container>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-[4/3] rounded-[var(--radius-lg-token)]"
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

export function AdminPageSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading administration page"
      className="p-6 lg:p-10"
    >
      <Stack gap="lg">
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="min-h-96 w-full rounded-[var(--radius-lg-token)]" />
      </Stack>
      <span className="sr-only" role="status">
        Loading administration content…
      </span>
    </main>
  );
}
