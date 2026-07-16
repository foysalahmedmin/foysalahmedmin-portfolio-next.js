import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type SectionProps = ComponentPropsWithoutRef<"section"> & {
  spacing?: "none" | "compact" | "default";
};

export function Section({
  spacing = "default",
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        spacing === "compact" && "py-[var(--space-section-compact)]",
        spacing === "default" && "py-[var(--space-section)]",
        className
      )}
      {...props}
    />
  );
}

type ContainerProps = ComponentPropsWithoutRef<"div"> & {
  measure?: "wide" | "content" | "reading";
};

export function Container({
  measure = "wide",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        measure === "wide" && "container",
        measure === "content" && "container-content",
        measure === "reading" && "container-reading",
        className
      )}
      {...props}
    />
  );
}

type StackProps = ComponentPropsWithoutRef<"div"> & {
  gap?: "xs" | "sm" | "md" | "lg" | "xl";
};

const stackGaps: Record<NonNullable<StackProps["gap"]>, string> = {
  xs: "gap-2",
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-10",
  xl: "gap-16",
};

export function Stack({ gap = "md", className, ...props }: StackProps) {
  return (
    <div
      className={cn("flex flex-col", stackGaps[gap], className)}
      {...props}
    />
  );
}

type ClusterProps = ComponentPropsWithoutRef<"div"> & {
  gap?: "xs" | "sm" | "md" | "lg";
  align?: "start" | "center" | "end" | "baseline";
  justify?: "start" | "center" | "end" | "between";
};

const clusterGaps = {
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-8",
} as const;

const clusterAlign = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
} as const;

const clusterJustify = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

export function Cluster({
  gap = "md",
  align = "center",
  justify = "start",
  className,
  ...props
}: ClusterProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap",
        clusterGaps[gap],
        clusterAlign[align],
        clusterJustify[justify],
        className
      )}
      {...props}
    />
  );
}

type GridProps = ComponentPropsWithoutRef<"div"> & {
  columns?: 1 | 2 | 3 | 4 | 12;
  gap?: "sm" | "md" | "lg";
};

const gridColumns = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  12: "grid-cols-4 md:grid-cols-8 xl:grid-cols-12",
} as const;

const gridGaps = {
  sm: "gap-4",
  md: "gap-6 lg:gap-8",
  lg: "gap-8 lg:gap-12",
} as const;

export function Grid({
  columns = 3,
  gap = "md",
  className,
  ...props
}: GridProps) {
  return (
    <div
      className={cn("grid", gridColumns[columns], gridGaps[gap], className)}
      {...props}
    />
  );
}

export function Bleed({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative left-1/2 w-screen max-w-[100dvw] -translate-x-1/2",
        className
      )}
      {...props}
    />
  );
}
