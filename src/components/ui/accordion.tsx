import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * Disclosure built on native <details>: it works without JavaScript, is keyboard and screen-reader
 * operable by default, and the open state is a plus/minus glyph rather than a colour. Pass the same
 * `name` to several items to make them exclusive.
 */
export type AccordionItemProps = Omit<ComponentProps<"details">, "title"> & {
  title: ReactNode;
};

export function AccordionItem({
  title,
  children,
  className,
  ...props
}: AccordionItemProps) {
  return (
    <details
      className={cn("accordion-item border-line-2 border-b", className)}
      {...props}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 py-3 font-semibold [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <Plus
          className="accordion-glyph size-4 shrink-0 transition-transform"
          aria-hidden="true"
        />
      </summary>
      <div className="text-fg-secondary pb-5 leading-7">{children}</div>
    </details>
  );
}

export function Accordion({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("border-line-2 border-t", className)} {...props} />;
}
