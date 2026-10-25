import { EngineProvider } from "@/components/motion/engine-provider";
import { PublicEnhancements } from "@/components/motion/public-enhancements";
import type { PaletteCommand } from "@/lib/palette/commands";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ChromeToneController } from "./chrome-tone-controller";
import { SurfaceMarker } from "./surface-marker";

type PublicSurfaceProps = {
  children: ReactNode;
  /** The next/font variable classes, also copied to <html> so portals inherit the faces. */
  fontClassNames: string;
  /** The palette's command set, built from the published site. */
  commands: readonly PaletteCommand[];
};

/**
 * The public stage: the surface attributes, fonts, grain, chrome tone and the deferred
 * enhancements (motion engine, route shutter, cursor, command palette). Every public route group
 * renders inside it, so the System lab and the Motion lab see exactly what visitors see.
 */
export function PublicSurface({
  children,
  fontClassNames,
  commands,
}: PublicSurfaceProps) {
  return (
    <EngineProvider>
      <div
        data-surface="public"
        data-density="comfortable"
        className={cn(
          fontClassNames,
          "bg-background text-foreground font-text min-h-dvh"
        )}
      >
        <SurfaceMarker surface="public" fontClassNames={fontClassNames} />
        <ChromeToneController />
        {children}
        <div className="grain" aria-hidden="true" />
        <PublicEnhancements commands={commands} />
      </div>
    </EngineProvider>
  );
}
