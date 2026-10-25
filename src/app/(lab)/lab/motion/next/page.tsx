import { MonoLabel } from "@/components/ui/mono-label";
import Link from "next/link";

export default function MotionLabSecondPage() {
  return (
    <main data-archetype="lab" className="container py-24">
      <MonoLabel>/lab/motion/next</MonoLabel>
      <h1 className="t-h1 mt-4">Second page</h1>
      <p className="t-lead text-fg-secondary mt-6 max-w-prose">
        You arrived through the route shutter (full motion, View Transitions) or
        the page-enter preset. The header did not move. Go back to compare.
      </p>
      <p className="mt-8">
        <Link href="/lab/motion" className="link-draw font-semibold">
          Back to the Motion lab
        </Link>
      </p>
    </main>
  );
}
