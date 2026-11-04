import { NotFoundView } from "@/components/pages/system-views";
import { buildNoIndexMetadata } from "@/lib/metadata/noindex";
import { cn } from "@/lib/utils";
import { publicFontVariables } from "./(common)/fonts";

export const metadata = buildNoIndexMetadata({ title: "Not found" });

// Reached for addresses that match no route. It renders outside the public layout, so it carries its
// own surface and font scope; `notFound()` inside the public routes uses (common)/not-found.tsx.
export default function NotFound() {
  return (
    <div
      data-surface="public"
      className={cn(
        publicFontVariables,
        "bg-background text-foreground font-text min-h-dvh"
      )}
    >
      <NotFoundView fullHeight />
    </div>
  );
}
