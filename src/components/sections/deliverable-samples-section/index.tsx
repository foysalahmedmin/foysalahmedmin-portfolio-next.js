import type {
  TPublicSiteDto,
  TSiteDeliverableKind,
} from "@/app/api/site/site.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";
import { MonoLabel } from "@/components/ui/mono-label";
import { StatusMark } from "@/components/ui/status-mark";
import { TextLink } from "@/components/ui/text-link";
import type { CSSProperties } from "react";

type Props = Readonly<{ site: TPublicSiteDto; heading?: string }>;

const LEAD = "Real artifacts from my own projects, not mock-ups.";

const KIND_LABEL: Readonly<Record<TSiteDeliverableKind, string>> = {
  decision_record: "Decision record",
  diagram: "Architecture diagram",
  runbook: "Runbook",
  report: "Test report",
  dry_run: "Migration dry run",
};

/**
 * Chapter 4b, deliverables you can inspect (docs plan 4.1): a document viewer built from radio inputs and
 * CSS, with no JavaScript. Each sample is one `.doc-item` (radio, tab label, page), so the checked radio
 * selects its own page with sibling selectors: tabs beside a printed page on desktop, an accordion on a
 * phone, every page stacked under reduced motion. The first sample is checked in the server HTML.
 */
export default function DeliverableSamplesSection({ site, heading }: Props) {
  const samples = site.deliverable_samples.filter(
    (sample) =>
      sample.enabled &&
      (sample.verification === "derived" || sample.verification === "verified")
  );
  if (!samples.length) return null;

  return (
    <section
      id="deliverables"
      aria-labelledby="deliverables-heading"
      className="py-[var(--space-section)]"
    >
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="/deliverables"
            title={heading || "What you actually receive"}
            titleId="deliverables-heading"
            lead={LEAD}
          />
        </Reveal>

        <Reveal
          className="doc-viewer"
          role="radiogroup"
          aria-label="Sample documents"
          style={{ "--samples": samples.length } as CSSProperties}
        >
          {samples.map((sample, index) => {
            const radioId = `sample-${sample.key}`;
            const titleId = `sample-title-${sample.key}`;
            return (
              <div
                key={sample.key}
                className="doc-item"
                style={{ "--i": index + 1 } as CSSProperties}
              >
                <input
                  type="radio"
                  name="deliverable-sample"
                  id={radioId}
                  value={sample.key}
                  defaultChecked={index === 0}
                  className="doc-radio"
                />
                <label htmlFor={radioId} className="doc-tab">
                  <MonoLabel className="doc-tab__kind">
                    {KIND_LABEL[sample.kind]}
                  </MonoLabel>
                  <span className="doc-tab__title">{sample.title}</span>
                </label>
                <article
                  className="doc-page"
                  data-tone="paper"
                  data-kind={sample.kind}
                  aria-labelledby={titleId}
                >
                  <header className="doc-page__bar">
                    <MonoLabel>{KIND_LABEL[sample.kind]}</MonoLabel>
                    <h3 id={titleId} className="doc-page__title">
                      {sample.title}
                    </h3>
                  </header>
                  <pre className="doc-page__body" tabIndex={0}>
                    {sample.excerpt}
                  </pre>
                  <footer className="doc-page__foot">
                    <span className="t-eyebrow">Source</span>
                    {sample.source_slug ? (
                      <TextLink
                        variant="quiet"
                        href={`/case-studies/${sample.source_slug}`}
                      >
                        {sample.source_label}
                      </TextLink>
                    ) : (
                      <span>{sample.source_label}</span>
                    )}
                    <StatusMark
                      state={
                        sample.verification === "verified"
                          ? "verified"
                          : "derived"
                      }
                      className="t-eyebrow doc-page__mark"
                    >
                      {sample.verification === "verified"
                        ? "Verified"
                        : "Derived from code"}
                    </StatusMark>
                  </footer>
                </article>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
