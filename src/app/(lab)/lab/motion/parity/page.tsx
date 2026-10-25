import { Counter } from "@/components/motion/counter";
import Reveal from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { MonoLabel } from "@/components/ui/mono-label";
import { REVEAL_VARIANTS } from "@/lib/motion/reveal";

/**
 * Reduced-motion parity fixture. Everything here sits below the first screen and ends in the same
 * pixels whether it animates or not; `tests/e2e/motion.spec.ts` renders it with reduced motion and again
 * with full motion after scrolling through, and requires the two images to match. Pinned scenes, the
 * cursor and the rail are left out on purpose: their layout differs by design.
 */
export default function MotionLabParityPage() {
  return (
    <main data-archetype="lab" className="container pb-32">
      <header className="py-16">
        <MonoLabel>/lab/motion/parity</MonoLabel>
        <h1 className="t-h1 mt-4">Parity</h1>
      </header>

      <div aria-hidden="true" style={{ blockSize: "120vh" }} />

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Reveals">
        {REVEAL_VARIANTS.map((variant, index, list) => (
          <Reveal
            key={variant}
            variant={variant}
            index={index}
            count={list.length}
            className="border-line-3 flex min-h-24 items-center border p-5"
          >
            <span className="font-mono text-xs">{variant}</span>
          </Reveal>
        ))}
      </section>

      <div aria-hidden="true" style={{ blockSize: "40vh" }} />

      <section className="flex flex-col gap-8" aria-label="Statements">
        <TextReveal as="h2" className="t-h2">
          Descenders and ascenders, jumping quickly, must survive the mask.
        </TextReveal>
        <TextReveal as="p" className="t-lead max-w-prose">
          The server renders the whole sentence. When the lines have finished
          settling, the page is exactly what reduced motion shows.
        </TextReveal>
      </section>

      <div aria-hidden="true" style={{ blockSize: "40vh" }} />

      <section className="grid gap-8 sm:grid-cols-3" aria-label="Figures">
        <span className="t-h2">
          <Counter value={3} />
        </span>
        <span className="t-h2">
          <Counter value={1280} suffix="+" />
        </span>
        <span className="t-h2">
          <Counter value={99.5} decimals={1} suffix="%" />
        </span>
      </section>
    </main>
  );
}
