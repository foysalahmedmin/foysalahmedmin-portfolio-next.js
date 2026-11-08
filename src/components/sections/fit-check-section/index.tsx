import type { TPublicSiteDto } from "@/app/api/site/site.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";

type Props = Readonly<{ site: TPublicSiteDto; heading?: string }>;

const LEAD = "Saying who the work is not for saves us both time.";

/**
 * Chapter 5c, the fit check (tier 2, docs plan 4.1): a paper band of two columns split by a hairline.
 * Pure server markup and no motion beyond the shared entrance, so reduced motion reads the same.
 */
export default function FitCheckSection({ site, heading }: Props) {
  const fit = site.fit;
  if (!fit || fit.segments.length === 0) return null;
  const notFit = fit.not_a_fit.filter((line) => line.trim());

  return (
    <section
      id="fit"
      aria-labelledby="fit-heading"
      data-tone="paper"
      className="py-[var(--space-section)]"
    >
      <div className="container">
        <SectionHead
          eyebrow="Fit"
          title={heading || "Who this is for"}
          titleId="fit-heading"
          lead={LEAD}
        />
        <Reveal className="fit-columns" data-single={notFit.length === 0}>
          <div className="fit-column">
            <h3 className="t-eyebrow fit-column__title">A good fit if</h3>
            <ul className="fit-list" role="list">
              {fit.segments.map((segment) => (
                <li key={segment.key}>
                  <strong className="fit-list__label">{segment.label}</strong>
                  <span className="fit-list__line">{segment.for_you_if}</span>
                </li>
              ))}
            </ul>
          </div>
          {notFit.length > 0 ? (
            <div className="fit-column">
              <h3 className="t-eyebrow fit-column__title">
                Probably not a fit if
              </h3>
              <ul className="fit-list" role="list">
                {notFit.map((line) => (
                  <li key={line}>
                    <span className="fit-list__line">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
