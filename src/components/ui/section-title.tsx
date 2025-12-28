import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps } from "react";

// ---------- SectionTitle ----------
const sectionTitleVariants = cva("mb-16", {
  variants: {
    variant: {
      center: "mx-auto text-center",
      start: "text-start",
      end: "text-end",
      none: "",
    },
  },
  defaultVariants: {
    variant: "center",
  },
});

type SectionTitleProps = ComponentProps<"div"> &
  VariantProps<typeof sectionTitleVariants>;

const SectionTitle = ({ className, variant, ...props }: SectionTitleProps) => {
  return (
    <div
      className={cn(sectionTitleVariants({ variant }), className)}
      {...props}
    />
  );
};
SectionTitle.displayName = "SectionTitle";

// ---------- Title ----------
type TitleProps = ComponentProps<"h2">;

const Title = ({ className, ...props }: TitleProps) => {
  return (
    <h2
      className={cn(
        "fade-up text-3xl font-bold tracking-tight delay-100 md:text-5xl",
        className
      )}
      {...props}
    />
  );
};
Title.displayName = "Title";

// ---------- Subtitle ----------
type SubtitleProps = ComponentProps<"span">;

const Subtitle = ({ className, ...props }: SubtitleProps) => {
  return (
    <span
      className={cn(
        "fade-left text-primary mb-3 inline-block text-sm font-bold tracking-widest uppercase",
        className
      )}
      {...props}
    />
  );
};
Subtitle.displayName = "Subtitle";

// ---------- Description ----------
type DescriptionProps = ComponentProps<"p">;

const Description = ({ className, ...props }: DescriptionProps) => {
  return (
    <p
      className={cn(
        "fade-up text-muted-foreground mx-auto mt-4 max-w-[700px] text-lg delay-200",
        className
      )}
      {...props}
    />
  );
};
Description.displayName = "Description";

// ---------- Exports ----------
export { Description, SectionTitle, Subtitle, Title };
