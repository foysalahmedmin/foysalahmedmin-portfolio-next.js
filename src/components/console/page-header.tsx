import { MonoLabel } from "@/components/ui/mono-label";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type ConsolePageHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  title: ReactNode;
  /** One line that says what this workspace is for. */
  description?: ReactNode;
  /** Mono eyebrow above the title (the workspace group, for example "Governance"). */
  eyebrow?: ReactNode;
  /** The primary action slot (one primary button, at most one secondary). */
  actions?: ReactNode;
  titleId?: string;
};

/** C2 page header: title (the only Display text in the console), one-line description, primary action. */
export function ConsolePageHeader({
  title,
  description,
  eyebrow,
  actions,
  titleId,
  className,
  ...props
}: ConsolePageHeaderProps) {
  return (
    <header
      data-cp="page-header"
      className={cn("cp-header", className)}
      {...props}
    >
      <div className="cp-header__text">
        {eyebrow ? (
          <MonoLabel className="cp-eyebrow">{eyebrow}</MonoLabel>
        ) : null}
        <h1 id={titleId} className="cp-title">
          {title}
        </h1>
        {description ? <p className="cp-lede">{description}</p> : null}
      </div>
      {actions ? <div className="cp-header__actions">{actions}</div> : null}
    </header>
  );
}
