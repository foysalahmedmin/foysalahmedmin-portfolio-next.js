import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { PublicArchetypeId } from "./archetypes";

export type TemplateIdentity = Readonly<{
  /** The route key (`home`, `about`, `case-studies`, `case-study`, ...), exposed as data-public-route. */
  route: string;
  /** Published Page revision, exposed as data-page-revision when the page comes from the Page model. */
  revision?: number | undefined;
}>;

/**
 * The single `<main>` of every public page. It carries the archetype id so the consistency probe,
 * the design lint and the System lab can find every page by shape rather than by route.
 */
export function TemplateRoot({
  archetype,
  route,
  revision,
  className,
  children,
}: TemplateIdentity & {
  archetype: PublicArchetypeId;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main
      data-archetype={archetype}
      data-public-route={route}
      data-page-revision={revision}
      className={cn("min-h-[60dvh]", className)}
    >
      {children}
    </main>
  );
}
