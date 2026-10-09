import { NotFoundView } from "@/components/pages/system-views";
import { buildNoIndexMetadata } from "@/lib/metadata/noindex";

export const metadata = buildNoIndexMetadata({ title: "Not found" });

export default function PublicNotFound() {
  return <NotFoundView />;
}
