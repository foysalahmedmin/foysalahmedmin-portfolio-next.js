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

const AdminRootLayout = ({ children }: { children: ReactNode }) => children;

export default AdminRootLayout;
