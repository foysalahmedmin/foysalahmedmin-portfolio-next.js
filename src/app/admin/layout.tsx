import { SurfaceMarker } from "@/components/surface/surface-marker";
import { buildNoIndexMetadata } from "@/lib/metadata/noindex";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildNoIndexMetadata({
  referrer: "no-referrer",
  title: {
    default: "Admin Portal",
    template: "%s | Admin Portal",
  },
});

// The console is its own surface (docs plan 3.11); the marker keeps it right across client navigations
const AdminRootLayout = ({ children }: { children: ReactNode }) => (
  <>
    <SurfaceMarker surface="console" />
    {children}
  </>
);

export default AdminRootLayout;
