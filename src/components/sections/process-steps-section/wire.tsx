import type { TSiteProcessStep } from "@/app/api/site/site.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";
import { stripLeadingNumber } from "@/lib/text/strip-number";
import type { CSSProperties } from "react";

const EYEBROW = "How I work";
const LEAD =
  "A project should feel calm because the risk has somewhere to go: each step leaves something you can see before the next one starts.";
const DELIVERABLE_LABEL = "You get";

/**
 * Chapter 5, how a project runs (docs plan 4.1): a paper band with a vertical wire down the left and
 * the enabled steps along it. The order is real and the wire carries it, so there are no numbers; the
 * list is an `<ol>` for assistive technology.
 *
 * A server component with no client code. The engine marks `data-scroll-progress` and writes
 * `--progress` (0 to 1) as the wire crosses the screen; the CSS draws the wire with it, carries a
 * pulse of light at its tip and lights each step as the wire reaches it. Without the engine
 * `--progress` is 1, so the wire is whole and every step is at full strength.
 */
export default function ProcessWire({
  steps,
  heading,
}: {
  steps: readonly TSiteProcessStep[];
  heading?: string;
}) {
  const visible = steps.filter((step) => step.enabled);
  if (!visible.length) return null;

  return (
    <section
      id="working-process"
      aria-labelledby="process-heading"
      data-band
      data-tone="paper"
      data-chapter="process"
      data-chapter-label="Process"
      className="process-band"
    >
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow={EYEBROW}
            title={heading || "How a project runs"}
            titleId="process-heading"
            lead={LEAD}
          />
        </Reveal>

        {/* The head of the pulse sits on the 60% line while the wire crosses the screen */}
        <div
          className="process-wire"
          data-scroll-progress=""
          data-progress-range="top 60%,bottom 60%"
        >
          <span className="process-rail" aria-hidden="true">
            <span className="process-fill" />
          </span>
          <ol
            role="list"
            className="process-steps"
            aria-label="How a project runs, in order"
          >
            {visible.map((step, index) => (
              <li
                key={step.key}
                className="process-step"
                style={
                  {
                    "--at": (index / visible.length).toFixed(4),
                  } as CSSProperties
                }
              >
                <h3 className="process-title t-h4">
                  {stripLeadingNumber(step.title)}
                </h3>
                {step.summary ? (
                  <p className="process-summary">{step.summary}</p>
                ) : null}
                {step.deliverable ? (
                  <p className="process-output">
                    <span className="process-output-label t-eyebrow">
                      {DELIVERABLE_LABEL}
                    </span>{" "}
                    {step.deliverable}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
