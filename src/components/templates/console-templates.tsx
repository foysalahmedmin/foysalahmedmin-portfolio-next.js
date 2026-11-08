import {
  ConsolePageHeader,
  type ConsolePageHeaderProps,
} from "@/components/console/page-header";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import type { ConsoleArchetypeId } from "./archetypes";

/*
 * Console archetype templates (docs plan 3.12, 4.3). The region is a div, not a main: the admin shell
 * already owns the page's single <main> landmark. Only C6 (auth, which has no shell) is the <main>. C2 to C4 compose the pattern components of
 * src/components/console; their styles are the cp- classes of console-patterns.css.
 */

type ConsoleRegionProps = Omit<ComponentProps<"div">, "title"> & {
  /** Page header: title, one-line description, primary action. */
  header?: ReactNode;
};

function ConsoleRegion({
  archetype,
  as: Tag = "div",
  header,
  className,
  children,
  ...props
}: ConsoleRegionProps & {
  archetype: ConsoleArchetypeId;
  as?: "div" | "main";
}) {
  return (
    <Tag
      data-archetype={archetype}
      className={cn("flex min-w-0 flex-col gap-6", className)}
      {...props}
    >
      {header}
      {children}
    </Tag>
  );
}

/** C1 Overview: the dashboard. Status line, needs-attention first, then the publishing pipeline. */
export function ConsoleOverview(props: ConsoleRegionProps) {
  return <ConsoleRegion archetype="C1" {...props} />;
}

/**
 * C2 Workspace list: page header, toolbar, then the table or one of the list states. Pass `title` (and
 * `description`, `eyebrow`, `actions`) for the standard header, or `header` for a custom one.
 */
export function ConsoleList({
  title,
  description,
  eyebrow,
  actions,
  toolbar,
  header,
  children,
  ...props
}: ConsoleRegionProps &
  Partial<
    Pick<
      ConsolePageHeaderProps,
      "title" | "description" | "eyebrow" | "actions"
    >
  > & { toolbar?: ReactNode }) {
  return (
    <ConsoleRegion
      archetype="C2"
      header={
        header ??
        (title ? (
          <ConsolePageHeader
            title={title}
            description={description}
            eyebrow={eyebrow}
            actions={actions}
          />
        ) : undefined)
      }
      {...props}
    >
      {toolbar}
      {children}
    </ConsoleRegion>
  );
}

/**
 * C3 Editor: header, validation summary, a section index beside the sections (a rail from 1280 px, a
 * sticky strip below) and a sticky action bar. Wrap it in the editor's <form> so the bar can submit.
 */
export function ConsoleEditor({
  validation,
  sectionIndex,
  actionBar,
  className,
  children,
  ...props
}: ConsoleRegionProps & {
  validation?: ReactNode;
  sectionIndex?: ReactNode;
  actionBar?: ReactNode;
}) {
  return (
    <ConsoleRegion
      archetype="C3"
      className={cn("cp-editor", className)}
      {...props}
    >
      {validation}
      <div
        className="cp-editor__body"
        data-index={sectionIndex ? "" : undefined}
      >
        {sectionIndex}
        <div className="cp-editor__sections">{children}</div>
      </div>
      {actionBar}
    </ConsoleRegion>
  );
}

/**
 * C4 Inbox: master-detail. The list is on the left and the message on the right; below 1024 px only the
 * pane named by `view` shows, so the detail replaces the list. `j`/`k` and `e` belong to the adopter.
 * Put a control with class `cp-inbox__back` in the detail to return to the list on small screens.
 */
export function ConsoleInbox({
  list,
  detail,
  view = "list",
  listLabel = "Messages",
  detailLabel = "Message",
  children,
  ...props
}: ConsoleRegionProps & {
  list?: ReactNode;
  detail?: ReactNode;
  view?: "list" | "detail";
  listLabel?: string;
  detailLabel?: string;
}) {
  return (
    <ConsoleRegion archetype="C4" {...props}>
      {list !== undefined || detail !== undefined ? (
        <div className="cp-inbox" data-cp="inbox" data-view={view}>
          <section aria-label={listLabel} className="cp-inbox__list">
            {list}
          </section>
          <section aria-label={detailLabel} className="cp-inbox__detail">
            {detail}
          </section>
        </div>
      ) : null}
      {children}
    </ConsoleRegion>
  );
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
      as="main"
      className={cn("mx-auto max-w-md justify-center", className)}
      {...props}
    />
  );
}
