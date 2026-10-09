import { Skeleton } from "@/components/ui/async-state";
import { cn } from "@/lib/utils";
import type { PublicArchetypeId } from "./archetypes";

const lines = (count: number, className?: string) =>
  Array.from({ length: count }, (_, index) => (
    <Skeleton
      key={index}
      className={cn("h-4", index === count - 1 ? "w-2/3" : "w-full", className)}
    />
  ));

function HeaderSkeleton() {
  return (
    <div
      data-page-header
      className="border-line-2 border-b py-[var(--space-section-compact)]"
    >
      <div className="container flex flex-col gap-6">
        <Skeleton className="h-3 w-40" />
        <div className="flex max-w-3xl flex-col gap-3">
          <Skeleton className="h-14 w-full md:h-24" />
          <Skeleton className="h-14 w-2/3 md:h-24" />
        </div>
        <div className="flex max-w-xl flex-col gap-2">{lines(2, "h-5")}</div>
      </div>
    </div>
  );
}

function Rows({ count = 6 }: { count?: number }) {
  return (
    <ul className="border-line-2 border-t" role="list">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="border-line-2 grid items-center gap-6 border-b py-6 md:grid-cols-[8rem_1fr_6rem]"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-full max-w-xl" />
          <Skeleton className="h-3 w-16 md:justify-self-end" />
        </li>
      ))}
    </ul>
  );
}

function Body({ archetype }: { archetype: PublicArchetypeId }) {
  switch (archetype) {
    case "A1":
      return (
        <div className="container flex flex-col gap-10 py-[var(--space-section)]">
          <Skeleton className="h-[48dvh] w-full" />
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        </div>
      );
    case "A3":
      return (
        <div className="container grid gap-10 py-[var(--space-section)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="flex flex-col gap-10">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex flex-col gap-3">
                <Skeleton className="h-3 w-24" />
                {lines(4)}
              </div>
            ))}
          </div>
        </div>
      );
    case "A4":
    case "A7":
      return (
        <div
          className={cn(
            "container grid gap-10 py-[var(--space-section)]",
            archetype === "A4" && "lg:grid-cols-[minmax(0,46rem)_minmax(0,1fr)]"
          )}
        >
          <div className="flex flex-col gap-4">{lines(12)}</div>
          {archetype === "A4" ? <Skeleton className="h-64 w-full" /> : null}
        </div>
      );
    case "A5":
      return (
        <div className="container grid gap-10 py-[var(--space-section)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="flex flex-col gap-4">{lines(10)}</div>
        </div>
      );
    case "A6":
      return (
        <div className="container grid gap-10 py-[var(--space-section)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col gap-5">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      );
    default:
      return (
        <div className="container py-[var(--space-section)]">
          <Skeleton className="mb-8 h-12 w-full" />
          <Rows />
        </div>
      );
  }
}

/**
 * Archetype-shaped loading state (docs plan 3.12): the skeleton has the final layout's header and body
 * dimensions, so the page does not shift when content arrives. Used by each route's loading.tsx.
 */
export function ArchetypeSkeleton({
  archetype,
}: {
  archetype: PublicArchetypeId;
}) {
  return (
    <main
      data-archetype={archetype}
      data-public-route="loading"
      aria-busy="true"
      aria-label="Loading page"
    >
      {archetype === "A1" ? null : <HeaderSkeleton />}
      <Body archetype={archetype} />
      <span className="sr-only" role="status">
        Loading content…
      </span>
    </main>
  );
}
