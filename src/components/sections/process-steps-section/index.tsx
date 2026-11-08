import type { TSiteProcessStep } from "@/app/api/site/site.type";
import ProcessWire from "./wire";

/**
 * "How I work" is the process wire (docs plan 4.1, Ch.5). The older `numbered` card row, which needed a
 * client component on every public page, is retired: any layout a stored Page still names renders the wire.
 */
export default function ProcessStepsSection({
  steps,
  heading,
}: {
  steps: readonly TSiteProcessStep[];
  heading?: string;
  /** Ignored: every layout is the wire. */
  layout?: string;
}) {
  return <ProcessWire steps={steps} heading={heading} />;
}
