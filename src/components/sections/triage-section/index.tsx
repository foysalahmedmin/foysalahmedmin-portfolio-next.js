import type { TPublicServiceDto } from "@/app/api/services/service.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";
import { TextLink } from "@/components/ui/text-link";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

type Props = Readonly<{
  services: readonly TPublicServiceDto[];
  heading?: string;
}>;

// Fixed copy (plan 5.4): true whatever the data holds.
const TRIAGE_COPY = {
  eyebrow: "/triage",
  heading: "What is slowing your business down?",
  lead: "Pick the sentence that sounds like your week.",
  approach: "Approach",
  deliverable: "Deliverable",
  outcome: "Outcome",
  describe: "Describe this problem",
  caseFile: "Related case file",
} as const;

const GROUP_LABEL = {
  systems: "Systems",
  "ai-automation": "AI Automation",
} as const;

type Group = keyof typeof GROUP_LABEL;

/** AI Automation is its own group; architecture and software are both "Systems". */
const groupOf = (service: TPublicServiceDto): Group =>
  service.primary_pillar === "ai_automation" ? "ai-automation" : "systems";

const step = (value: number) => ({ "--k": value }) as CSSProperties;

/**
 * Chapter 1, "triage" (docs plan 4.1): every pain is one large sentence. With the engine the pain at
 * the middle of the screen is full strength, its Approach, Deliverable and Outcome lines reveal one
 * after another, and the sticky group label follows it; `:focus-within` does the same for the keyboard.
 * Without the engine (reduced, off, touch, no JavaScript) every row shows every line. Rows never change
 * size: the lines keep their space while hidden, so nothing shifts while scrolling.
 */
export default function TriageSection({ services, heading }: Props) {
  const rows = services.flatMap((service) =>
    (service.problems ?? []).map((problem) => ({
      ...problem,
      id: `${service.slug}:${problem.key}`,
      group: groupOf(service),
    }))
  );
  if (rows.length === 0) return null;

  const groups = [...new Set(rows.map((row) => row.group))];

  return (
    <section
      id="triage"
      aria-labelledby="triage-heading"
      data-chapter="triage"
      data-chapter-label="Problems"
      data-tone="ink"
      data-scroll-progress=""
      data-progress-range="top bottom,bottom top"
      className="triage py-[var(--space-section)]"
    >
      <div className="triage-grid container">
        <div className="triage-aside">
          {/* A huge ghosted glyph in the texture of the active group; drifts with --progress */}
          <div className="triage-ghost" aria-hidden="true">
            {groups.map((group) => (
              <span
                key={group}
                data-glyph={group}
                className={`triage-glyph ${group === "systems" ? "tx-blueprint" : "tx-dots"}`}
              >
                /
              </span>
            ))}
          </div>

          <Reveal>
            <SectionHead
              eyebrow={TRIAGE_COPY.eyebrow}
              title={heading || TRIAGE_COPY.heading}
              titleId="triage-heading"
              lead={TRIAGE_COPY.lead}
            />
          </Reveal>

          <p className="triage-groups t-eyebrow" aria-hidden="true">
            {groups.map((group) => (
              <span key={group} data-group-key={group}>
                {GROUP_LABEL[group]}
              </span>
            ))}
          </p>
        </div>

        <ol className="triage-list" data-scroll-focus="">
          {rows.map((row) => {
            const lines = [
              [TRIAGE_COPY.approach, row.approach],
              [TRIAGE_COPY.deliverable, row.deliverable],
              [TRIAGE_COPY.outcome, row.outcome],
            ].filter((line): line is [string, string] => Boolean(line[1]));

            return (
              <li
                key={row.id}
                data-focus-row=""
                data-group={row.group}
                className="triage-row"
              >
                <p className="triage-tag t-eyebrow">{GROUP_LABEL[row.group]}</p>
                <h3 className="triage-pain t-h3">{row.pain}</h3>

                <dl className="triage-details">
                  {lines.map(([label, text], k) => (
                    <div
                      key={label}
                      className="triage-line triage-reveal"
                      style={step(k)}
                    >
                      <dt className="t-eyebrow">{label}</dt>
                      <dd>{text}</dd>
                    </div>
                  ))}
                </dl>

                <p
                  className="triage-links triage-reveal"
                  style={step(lines.length)}
                >
                  <TextLink
                    variant="quiet"
                    href={`/contact?topic=${encodeURIComponent(row.key)}`}
                  >
                    {TRIAGE_COPY.describe}
                    <ArrowRight
                      className="size-3.5 self-center"
                      aria-hidden="true"
                    />
                  </TextLink>
                  {row.case_slug && (
                    <TextLink
                      variant="quiet"
                      href={`/case-studies/${encodeURIComponent(row.case_slug)}`}
                    >
                      {TRIAGE_COPY.caseFile}
                    </TextLink>
                  )}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
