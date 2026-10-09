import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

export type TextLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  /**
   * `inline` (default) keeps an underline at rest, because a link inside running text must not be told
   * apart by colour alone (WCAG 1.4.1) and these tokens have no link colour. `quiet` is for navigation and
   * standalone links: the underline draws in on hover and focus (M27).
   */
  variant?: "inline" | "quiet";
  /** Open in a new tab with a safe rel and a visible arrow. Detected automatically for https URLs. */
  external?: boolean;
};

export function TextLink({
  href,
  variant = "inline",
  external,
  className,
  children,
  ...props
}: TextLinkProps) {
  const isExternal = external ?? /^https?:\/\//.test(href);
  const classes = cn(
    "inline-flex items-baseline gap-1",
    variant === "inline"
      ? "decoration-line-4 hover:decoration-foreground underline underline-offset-4 transition-colors"
      : "link-draw",
    className
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {children}
        <ArrowUpRight className="size-3.5 self-center" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
