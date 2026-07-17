import type { TPublicSitePillarDto } from "@/app/api/site/site.type";
import ParallaxLayer from "@/components/motion/parallax-layer";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { CSSProperties } from "react";

const PILLAR_ACCENT_TOKENS: Record<
  string,
  Readonly<{ accent: string; surface: string }>
> = {
  brand: { accent: "var(--primary)", surface: "var(--accent)" },
  cyan: {
    accent: "var(--pillar-frontend)",
    surface: "var(--pillar-frontend-surface)",
  },
  blue: {
    accent: "var(--pillar-backend)",
    surface: "var(--pillar-backend-surface)",
  },
  violet: {
    accent: "var(--pillar-ai)",
    surface: "var(--pillar-ai-surface)",
  },
  amber: {
    accent: "var(--pillar-system)",
    surface: "var(--pillar-system-surface)",
  },
  emerald: {
    accent: "var(--pillar-full-stack)",
    surface: "var(--pillar-full-stack-surface)",
  },
};

type PillarShowcaseLayout = "default" | "compact" | "sticky" | string;

const getAccentTokens = (accent: string) =>
  PILLAR_ACCENT_TOKENS[accent] ?? PILLAR_ACCENT_TOKENS["brand"];

const toPillarStyle = (accent: string) => {
  const tokens = getAccentTokens(accent);
  return {
    "--pillar-card-accent": tokens.accent,
    "--pillar-card-surface": tokens.surface,
    background:
      "linear-gradient(135deg, color-mix(in oklch, var(--pillar-card-surface) 68%, transparent), color-mix(in oklch, var(--card) 92%, transparent))",
    borderColor:
      "color-mix(in oklch, var(--pillar-card-accent) 54%, transparent)",
  } as CSSProperties;
};

const PillarCard = ({
  pillar,
  index,
  sticky = false,
}: {
  pillar: TPublicSitePillarDto;
  index: number;
  sticky?: boolean;
}) => {
  const pillarStyle = toPillarStyle(pillar.accent);

  return (
    <li
      style={pillarStyle}
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-lg-token)] border p-6",
        "shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform]",
        "duration-[var(--motion-standard)] motion-safe:hover:-translate-y-1",
        "hover:shadow-[var(--shadow-sm)]",
        sticky ? "min-h-[18rem] backdrop-blur-xl" : ""
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20"
        aria-hidden="true"
      />
      <div
        className="bg-primary/10 absolute -right-16 -bottom-20 size-44 rounded-full blur-3xl transition-transform duration-[var(--motion-slow)] motion-safe:group-hover:scale-125"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-5">
          <span
            className="type-label font-bold text-[color:var(--pillar-card-accent)]"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          {sticky && (
            <span className="border-border text-muted-foreground rounded-full border px-3 py-1 text-[0.62rem] font-black tracking-[0.16em] uppercase">
              {pillar.key.replace("_", " ")}
            </span>
          )}
        </div>

        <h3 className="mt-4 text-xl leading-tight font-black">
          {pillar.label}
        </h3>

        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {pillar.client_outcome ||
            pillar.summary ||
            pillar.seo_summary ||
            "Published discipline details are being prepared."}
        </p>

        {pillar.capabilities.length > 0 && (
          <ul
            className={cn("mt-6 grid gap-2", sticky ? "sm:grid-cols-2" : "")}
            aria-label={`${pillar.label} capabilities`}
          >
            {pillar.capabilities.slice(0, sticky ? 6 : 4).map((cap) => (
              <li
                key={cap}
                className="text-muted-foreground flex items-start gap-2 text-xs leading-5"
              >
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--pillar-card-accent)]"
                  aria-hidden="true"
                />
                {cap}
              </li>
            ))}
          </ul>
        )}

        {pillar.technologies.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {pillar.technologies.slice(0, sticky ? 7 : 5).map((tech) => (
              <span
                key={tech}
                className="border-border bg-background/45 text-muted-foreground rounded-md border px-2 py-0.5 text-xs"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {sticky && (
          <div
            className="border-border mt-7 flex flex-wrap gap-2 border-t pt-5"
            aria-label={`${pillar.label} proof links`}
          >
            <Link
              href={`/projects?pillar=${pillar.key}`}
              className="focus-visible:ring-primary hover:text-primary-foreground rounded-full border border-[color:var(--pillar-card-accent)] px-3 py-1.5 text-xs font-black text-[color:var(--pillar-card-accent)] transition-colors hover:bg-[color:var(--pillar-card-accent)] focus-visible:ring-2 focus-visible:outline-none"
            >
              Projects
            </Link>
            <Link
              href={`/articles?pillar=${pillar.key}`}
              className="border-border text-muted-foreground hover:border-primary hover:text-foreground focus-visible:ring-primary rounded-full border px-3 py-1.5 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Articles
            </Link>
            <Link
              href="#services"
              className="border-border text-muted-foreground hover:border-primary hover:text-foreground focus-visible:ring-primary rounded-full border px-3 py-1.5 text-xs font-black transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Services
            </Link>
          </div>
        )}
      </div>
    </li>
  );
};

export default function PillarShowcaseSection({
  className,
  pillars,
  heading,
  layout = "default",
}: {
  className?: string;
  pillars: readonly TPublicSitePillarDto[];
  heading?: string;
  layout?: PillarShowcaseLayout;
}) {
  const visible = pillars
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);
  const sticky = layout === "sticky";

  if (!visible.length) return null;

  return (
    <section
      id="pillar-showcase"
      aria-labelledby="pillar-showcase-heading"
      className={cn(
        "relative overflow-hidden py-[var(--space-section)]",
        sticky && "bg-surface-subtle/60",
        className
      )}
    >
      {sticky && (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <ParallaxLayer
            depth="subtle"
            pointerStrength={0.25}
            className="absolute inset-0"
          >
            <div className="bg-primary/10 absolute top-24 left-[8%] size-72 rounded-full blur-[110px]" />
            <div className="bg-secondary/10 absolute right-[4%] bottom-20 size-80 rounded-full blur-[120px]" />
          </ParallaxLayer>
        </div>
      )}

      <div className="relative container">
        {sticky ? (
          <div className="grid gap-12 lg:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.18fr)] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <SectionTitle className="text-left lg:mb-0">
                <Subtitle>Five disciplines · one operating system</Subtitle>
                <Title id="pillar-showcase-heading">
                  {heading || "A full-stack practice with one consistent spine"}
                </Title>
                <Description>
                  Frontend, backend, AI automation, system design, and
                  full-stack delivery are treated as one connected product
                  system—not five disconnected service labels.
                </Description>
              </SectionTitle>

              <div className="border-border bg-background/70 mt-8 rounded-[var(--radius-lg-token)] border p-5 backdrop-blur-xl">
                <p className="type-label text-muted-foreground">
                  Delivery principle
                </p>
                <p className="mt-3 text-sm leading-7 font-semibold">
                  Every UI decision has data, security, operations, and
                  automation consequences. The site mirrors that engineering
                  habit: visible polish backed by durable systems.
                </p>
              </div>
            </div>

            <ol className="space-y-5">
              {visible.map((pillar, index) => (
                <PillarCard
                  key={pillar.key}
                  pillar={pillar}
                  index={index}
                  sticky
                />
              ))}
            </ol>
          </div>
        ) : (
          <>
            <SectionTitle className="lg:mb-20">
              <Subtitle>Five disciplines · one engineer</Subtitle>
              <Title id="pillar-showcase-heading">
                {heading || "What I design, build, and ship"}
              </Title>
              <Description>
                Each capability has a distinct job. Together they produce
                products that are usable, secure, maintainable, and ready to
                operate at scale.
              </Description>
            </SectionTitle>

            <ol
              className={cn(
                "grid gap-5 md:grid-cols-2",
                layout === "compact" ? "xl:grid-cols-5" : "xl:grid-cols-3"
              )}
            >
              {visible.map((pillar, index) => (
                <PillarCard key={pillar.key} pillar={pillar} index={index} />
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
