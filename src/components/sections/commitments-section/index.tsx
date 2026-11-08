import type { TPublicSiteDto } from "@/app/api/site/site.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";

type Props = Readonly<{
  site: TPublicSiteDto;
  heading?: string;
  /** `default` reads `site.commitments`; `principles` reads `site.principles`. */
  layout?: string;
}>;

const COMMITMENTS_LEAD = "What I commit to on every project, stated plainly.";
const PRINCIPLES_LEAD = "The principles behind the choices, each in a line.";

/**
 * Chapters 7 and 7a, commitments and how I think (docs plan 4.1). Commitments are plain lines with a
 * glyph; principles are large Display statements stacked with hairlines. Server markup only: the lines
 * settle in through `Reveal`, and nothing is numbered.
 */
export default function CommitmentsSection({ site, heading, layout }: Props) {
  const principles = layout === "principles";
  const items = principles ? site.principles : site.commitments;
  if (items.length === 0) return null;

  const id = principles ? "principles" : "commitments";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="py-[var(--space-section)]"
      {...(principles
        ? {}
        : { "data-chapter": "trust", "data-chapter-label": "Trust" })}
    >
      <div className="container">
        <SectionHead
          eyebrow={principles ? "Judgement" : "Trust"}
          title={
            heading || (principles ? "How I think" : "How I keep projects safe")
          }
          titleId={`${id}-heading`}
          lead={principles ? PRINCIPLES_LEAD : COMMITMENTS_LEAD}
        />
        <ul className={principles ? "principles" : "trust-lines"} role="list">
          {items.map((item, index) => (
            <Reveal
              key={item.key}
              as="li"
              index={index}
              count={items.length}
              className={principles ? "principle" : "trust-line"}
            >
              {principles ? null : (
                <span className="trust-glyph" aria-hidden="true" />
              )}
              <h3
                className={principles ? "principle__statement" : "trust-title"}
              >
                {item.title}
              </h3>
              <p className={principles ? "principle__note" : "trust-summary"}>
                {item.summary}
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
