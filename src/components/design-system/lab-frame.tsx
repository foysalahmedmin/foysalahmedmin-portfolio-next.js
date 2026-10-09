import { publicFontVariables } from "@/app/(common)/fonts";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type LabTone = "ink" | "paper";
export type LabDensity = "comfortable" | "compact";
export type LabSurface = "public" | "console";

/**
 * A preview frame for the System lab. The outer element carries the surface and density (and the
 * font faces), the inner one carries the tone, so a frame always shows its own tone regardless of the
 * theme the admin itself is in. This is how one page can show ink and paper, comfortable and
 * compact, public and console side by side while the admin stays on its legacy tokens.
 */
export function LabFrame({
  title,
  tone = "ink",
  density = "comfortable",
  surface = "public",
  className,
  children,
}: {
  title: string;
  tone?: LabTone;
  density?: LabDensity;
  surface?: LabSurface;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className="min-w-0">
      <figcaption className="text-muted-foreground mb-2 font-mono text-xs">
        {title} · {surface} · {tone} · {density}
      </figcaption>
      <div
        data-surface={surface}
        data-density={density}
        className={cn(publicFontVariables, "overflow-clip rounded-md border")}
      >
        <div data-tone={tone} className={cn("font-text p-6", className)}>
          {children}
        </div>
      </div>
    </figure>
  );
}

/** Ink and paper frames side by side. */
export function TonePair({
  title,
  density = "comfortable",
  surface = "public",
  stacked = false,
  className,
  children,
}: {
  title: string;
  density?: LabDensity;
  surface?: LabSurface;
  /** Stack the two frames (for specimens wider than half the page, such as the display scale). */
  stacked?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-6", !stacked && "lg:grid-cols-2")}>
      {(["ink", "paper"] as const).map((tone) => (
        <LabFrame
          key={tone}
          title={title}
          tone={tone}
          density={density}
          surface={surface}
          {...(className ? { className } : {})}
        >
          {children}
        </LabFrame>
      ))}
    </div>
  );
}
