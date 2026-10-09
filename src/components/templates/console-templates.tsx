import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import type { ConsoleArchetypeId } from "./archetypes";

/*
 * Console archetype templates (docs plan 3.12, 4.3). Stubbed in Phase 1: they define the page
 * anatomy and carry the archetype id, but nothing in the admin renders them until the console
 * shell lands in Phase 7 (strangler rule), so the admin stays pixel-identical until then.
 */

type ConsoleRegionProps = Omit<ComponentProps<"main">, "title"> & {
  /** Page header: title, one-line description, primary action. */
  header?: ReactNode;
};

function ConsoleRegion({
  archetype,
  header,
  className,
  children,
  ...props
}: ConsoleRegionProps & { archetype: ConsoleArchetypeId }) {
  return (
    <main
      data-archetype={archetype}
      className={cn("flex min-w-0 flex-col gap-6", className)}
      {...props}
    >
      {header}
      {children}
    </main>
  );
}

/** C1 Overview: the dashboard. Status line, needs-attention first, then the publishing pipeline. */
export function ConsoleOverview(props: ConsoleRegionProps) {
  return <ConsoleRegion archetype="C1" {...props} />;
}

/** C2 Workspace list: page header, toolbar, table, bulk bar, with skeleton, empty and error states. */
export function ConsoleList(props: ConsoleRegionProps) {
  return <ConsoleRegion archetype="C2" {...props} />;
}

/** C3 Editor: header with status mark and revision, section index, sticky action bar. */
export function ConsoleEditor(props: ConsoleRegionProps) {
  return <ConsoleRegion archetype="C3" {...props} />;
}

/** C4 Inbox: master-detail with state marks. */
export function ConsoleInbox(props: ConsoleRegionProps) {
  return <ConsoleRegion archetype="C4" {...props} />;
}

/** C5 Settings: a single column of grouped sections. */
export function ConsoleSettings({ className, ...props }: ConsoleRegionProps) {
  return (
    <ConsoleRegion
      archetype="C5"
      className={cn("max-w-3xl", className)}
      {...props}
    />
  );
}

/** C6 Auth: sign-in, forgot and reset on a centred glass form. */
export function ConsoleAuth({ className, ...props }: ConsoleRegionProps) {
  return (
    <ConsoleRegion
      archetype="C6"
      className={cn("mx-auto max-w-md justify-center", className)}
      {...props}
    />
  );
}
