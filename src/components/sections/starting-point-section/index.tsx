import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { SectionHead } from "@/components/sections/signal/section-head";
import { Glass } from "@/components/ui/glass";
import Reveal from "@/components/motion/reveal";
import { TextLink } from "@/components/ui/text-link";
import FinderLoader from "./finder-loader";

type Props = Readonly<{ site: TPublicSiteDto; heading?: string }>;

const LEAD = "A few questions to point you at a sensible first step.";

/**
 * Chapter 5d, the starting-point finder (tier 2, docs plan 4.1). The shell, the heading and the plain
 * "Describe your problem" link are server markup, so the chapter is useful without JavaScript. The
 * questions are the one small client island, loaded after hydration.
 */
export default function StartingPointSection({ site, heading }: Props) {
  const { finder } = site;
  if (!finder || finder.steps.length === 0) return null;

  const models = site.engagement_models.map(({ key, name }) => ({ key, name }));

  return (
    <section
      id="finder"
      aria-labelledby="finder-heading"
      data-tone="paper"
      className="py-[var(--space-section)]"
    >
      <div className="container">
        <SectionHead
          eyebrow="Starting point"
          title={heading || "Not sure where to start?"}
          titleId="finder-heading"
          lead={LEAD}
        />
        <Reveal className="finder-stage tx-blueprint">
          <Glass tier={2} className="finder-panel ticks">
            <p className="t-eyebrow text-fg-secondary">
              A suggestion, not a quote.
            </p>
            <FinderLoader finder={finder} models={models} />
            <noscript>
              <p className="finder-noscript">
                The questions need JavaScript. You can describe your problem
                directly instead.
              </p>
            </noscript>
          </Glass>
        </Reveal>
        <p className="finder-skip">
          <TextLink href="/contact" variant="quiet">
            Describe your problem
          </TextLink>
        </p>
      </div>
    </section>
  );
}
