import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const tagVariants = cva(
  "t-eyebrow inline-flex min-h-6 items-center gap-1.5 rounded-sm border px-2 py-0.5 whitespace-nowrap",
  {
    variants: {
      variant: {
        outline: "border-line-3 text-fg-secondary",
        solid: "border-transparent bg-foreground text-background",
        quiet: "border-transparent bg-muted text-fg-secondary",
      },
    },
    defaultVariants: { variant: "outline" },
  }
);

export type TagProps = ComponentProps<"span"> &
  VariantProps<typeof tagVariants>;

export function Tag({ className, variant, ...props }: TagProps) {
  return (
    <span className={cn(tagVariants({ variant }), className)} {...props} />
  );
}
