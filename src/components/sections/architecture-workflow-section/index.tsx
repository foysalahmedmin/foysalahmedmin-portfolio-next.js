import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { SectionHead } from "@/components/sections/signal/section-head";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { stripLeadingNumber } from "@/lib/text/strip-number";
import { cn } from "@/lib/utils";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

const GUARDRAILS = [
  {
    key: "security",
    title: "Security boundary",
    copy: "DTOs, validation, managed media, and admin capabilities are designed as release blockers—not decoration.",
  },
  {
    key: "accessibility",
    title: "Accessibility boundary",
    copy: "Keyboard, reduced motion, semantic structure, and fallback states are treated as part of the core product surface.",
  },
  {
    key: "operations",
    title: "Operations boundary",
    copy: "Caching, telemetry, migration safety, and failure recovery stay visible while UI polish evolves.",
  },
] as const;

const AUTOMATION_STEPS = [
  "Map the workflow and the human approval point.",
  "Generate bounded drafts, data transforms, or operational assists.",
  "Validate outputs through typed contracts, logs, and review gates.",
  "Ship only the part that remains useful when automation is unavailable.",
] as const;

const RELATED_INSIGHT_LINKS = [
  {
    label: "Architecture writing",
    href: "/articles?pillar=system_architect",
    summary: "Design decisions, trade-offs, and operational thinking.",
  },
  {
    label: "Software development writing",
    href: "/articles?pillar=software_developer",
    summary: "How interface, API, data, and release quality connect.",
  },
  {
    label: "AI automation writing",
    href: "/articles?pillar=ai_automation",
    summary: "Automation patterns with validation and human control.",
  },
] as const;

/**
 * The path a request takes, drawn once. The coordinates, the distance of each stage along the path
 * (for when it lights up) and the full length are fixed here so the markup needs no measuring script.
 */
const FLOW_PATH = "M60 120 H500 V64 H640 V120 H930";
const FLOW_LENGTH = 982;
const FLOW_SECONDS = 10;
const FLOW_STAGES = [
  { label: "Request", x: 60, y: 120, at: 0 },
  { label: "Gateway", x: 230, y: 120, at: 170 },
  { label: "Services", x: 400, y: 120, at: 340 },
  { label: "AI agent", x: 570, y: 64, at: 566 },
  { label: "Human review", x: 740, y: 120, at: 792 },
  { label: "Delivered", x: 930, y: 120, at: 982 },
] as const;

const FlowDiagram = () => (
  <figure className="flow" aria-label="How a request moves through the system">
    <svg
      className="flow-svg"
      viewBox="0 0 1000 190"
      aria-hidden="true"
      focusable="false"
    >
      <path className="flow-wire" d={FLOW_PATH} />
      <path className="flow-current" d={FLOW_PATH} />
      {FLOW_STAGES.map((stage) => (
        <g
          key={stage.label}
          className="flow-node"
          style={
            {
              "--delay": `${((stage.at / FLOW_LENGTH) * FLOW_SECONDS).toFixed(2)}s`,
            } as CSSProperties
          }
        >
          <rect
            x={stage.x - 22}
            y={stage.y - 22}
            width="44"
            height="44"
            rx="6"
          />
          <circle cx={stage.x} cy={stage.y} r="5" />
          <text x={stage.x} y={stage.y + 46} textAnchor="middle">
            {stage.label}
          </text>
        </g>
      ))}
      <g className="flow-pulse" style={{ offsetPath: `path("${FLOW_PATH}")` }}>
        <circle className="flow-halo" r="16" />
        <circle className="flow-trail" cx="-16" r="4" />
        <circle className="flow-trail" cx="-30" r="3" />
        <circle className="flow-trail" cx="-42" r="2" />
        <circle className="flow-core" r="6" />
      </g>
    </svg>
    <figcaption className="sr-only">
      A request enters at the gateway, passes through the services, is handled
      by the AI agent, waits at a human review gate and is delivered.
    </figcaption>
  </figure>
);

export default function ArchitectureWorkflowSection({
  site,
  heading,
}: {
  site: TPublicSiteDto;
  heading?: string;
  layout?: string;
}) {
  const pillarsByKey = new Map<
    TPublicSiteDto["pillars"][number]["key"],
    TPublicSiteDto["pillars"][number]
  >();
  for (const pillar of site.pillars) {
    if (pillar.enabled && !pillarsByKey.has(pillar.key)) {
      pillarsByKey.set(pillar.key, pillar);
    }
  }
  const pillars = PILLAR_KEYS.flatMap((key) => {
    const pillar = pillarsByKey.get(key);
    return pillar ? [pillar] : [];
  });
  const processSteps = site.process.filter((step) => step.enabled).slice(0, 4);

  return (
    <section
      id="architecture-workflow"
      aria-labelledby="architecture-workflow-heading"
      className="bg-surface-subtle relative overflow-hidden py-[var(--space-section)]"
    >
      <div className="container grid gap-10 lg:gap-14">
        <SectionHead
          align="center"
          eyebrow="Architecture, AI automation and delivery"
          title={heading || "Solutions that stay reliable after launch"}
          titleId="architecture-workflow-heading"
          lead="Every solution is shaped around three connected roles. The same structure guides the work: decisions written down first, automation with human review, and operational guardrails before launch."
        />

        <FlowDiagram />

        <div className="grid gap-4 lg:grid-cols-3">
          <section
            className="flow-card"
            aria-labelledby="architecture-system-map-heading"
          >
            <h3 id="architecture-system-map-heading" className="t-eyebrow">
              System map
            </h3>
            <ul
              className="grid gap-4"
              role="list"
              aria-label="System map of the three roles in canonical order"
            >
              {pillars.map((pillar) => (
                <li key={pillar.key}>
                  <h4 className="font-semibold">{pillar.label}</h4>
                  <p className="text-fg-secondary mt-1 line-clamp-3 text-sm leading-6">
                    {pillar.summary ||
                      pillar.seo_summary ||
                      "Capability copy is managed through the Site profile."}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="flow-card"
            aria-labelledby="architecture-ai-lane-heading"
          >
            <h3 id="architecture-ai-lane-heading" className="t-eyebrow">
              AI automation lane
            </h3>
            <p className="font-semibold">
              Helpful automation stays inside a reviewable system.
            </p>
            <ul
              className="grid gap-3"
              role="list"
              aria-label="AI automation workflow with human review boundaries"
            >
              {AUTOMATION_STEPS.map((step) => (
                <li key={step} className="flex gap-3 text-sm leading-6">
                  <ArrowRight
                    className="text-fg-secondary mt-1 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-fg-secondary">{step}</span>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="flow-card"
            aria-labelledby="architecture-guardrails-heading"
          >
            <h3 id="architecture-guardrails-heading" className="t-eyebrow">
              Delivery guardrails
            </h3>
            <ul className="grid gap-4" role="list">
              {GUARDRAILS.map((guardrail) => (
                <li key={guardrail.key}>
                  <h4 className="font-semibold">{guardrail.title}</h4>
                  <p className="text-fg-secondary mt-1 text-sm leading-6">
                    {guardrail.copy}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {processSteps.length > 0 && (
          <div className="flow-sequence">
            <p className="t-eyebrow">Current delivery sequence</p>
            <ul role="list">
              {processSteps.map((step, index) => (
                <li key={step.key}>
                  {index > 0 && (
                    <ArrowRight className="size-4" aria-hidden="true" />
                  )}
                  <span>{stripLeadingNumber(step.title)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <nav
          className="grid gap-4 md:grid-cols-3"
          aria-label="Related technical insight paths"
        >
          {RELATED_INSIGHT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("flow-link group")}
            >
              <span className="flex items-center justify-between gap-3 font-semibold">
                {link.label}
                <ArrowUpRight
                  className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="text-fg-secondary mt-1 block text-sm leading-6">
                {link.summary}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
