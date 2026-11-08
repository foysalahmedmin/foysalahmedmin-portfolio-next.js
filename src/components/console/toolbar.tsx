import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type ConsoleToolbarProps = Omit<ComponentProps<"div">, "children"> & {
  /** Accessible name of the group. */
  label?: string;
  /** Render as a search form so the controls submit together (role="search"). */
  as?: "div" | "form";
  search?: ReactNode;
  /** Status chips (`cp-chip` buttons or links with aria-pressed / aria-current). */
  chips?: ReactNode;
  sort?: ReactNode;
  /** Density toggle. */
  density?: ReactNode;
  /** Any other control (a date window, a select). Sits between the chips and the sort. */
  children?: ReactNode;
};

/** C2 toolbar: a plain layout of slots on a sticky solid bar (no blur). Empty slots render nothing. */
export function ConsoleToolbar({
  label = "List controls",
  as: Tag = "div",
  search,
  chips,
  sort,
  density,
  className,
  children,
  ...props
}: ConsoleToolbarProps) {
  const end = sort || density;
  return (
    <Tag
      data-cp="toolbar"
      aria-label={label}
      {...(Tag === "form" ? { role: "search" } : { role: "group" })}
      className={cn("cp-toolbar", className)}
      {...(props as object)}
    >
      {search ? <div className="cp-toolbar__search">{search}</div> : null}
      {chips ? <div className="cp-toolbar__chips">{chips}</div> : null}
      {children}
      {end ? (
        <div className="cp-toolbar__end">
          {sort}
          {density}
        </div>
      ) : null}
    </Tag>
  );
}
