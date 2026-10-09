import { ArchetypeSkeleton } from "@/components/templates/archetype-skeleton";

// Segment-level fallback for any public route without its own loading.tsx: the index shape.
export default function Loading() {
  return <ArchetypeSkeleton archetype="A2" />;
}
