import { LabHeader } from "@/components/motion-lab/lab-header";
import { PublicSurface } from "@/components/surface/public-surface";
import { isMotionLabEnabled } from "@/lib/motion/lab";
import { buildPaletteCommands } from "@/lib/palette/build";
import { readPublishedSite } from "@/lib/site/published-site";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { publicFontVariables } from "../(common)/fonts";

// Whether the lab exists is decided per request (MOTION_LAB), never frozen at build time
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Motion lab",
  robots: { index: false, follow: false },
};

export default async function LabLayout({ children }: { children: ReactNode }) {
  if (!isMotionLabEnabled()) notFound();
  const site = await readPublishedSite();

  return (
    <PublicSurface
      fontClassNames={publicFontVariables}
      commands={buildPaletteCommands(site)}
    >
      <LabHeader />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
    </PublicSurface>
  );
}
