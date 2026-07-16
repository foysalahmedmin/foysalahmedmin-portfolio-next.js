import type { TPublicSiteDto } from "@/app/api/site/site.type";
import OptimizedMedia from "@/components/ui/optimized-media";
import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";
import { ArrowRight, Layers3 } from "lucide-react";
import Link from "next/link";

const AboutSection = ({ site }: { site: TPublicSiteDto }) => {
  const profile = site.brand.profile ?? site.fallbacks.profile;
  const pillars = site.pillars.filter((pillar) => pillar.enabled);

  return (
    <section id="about" className="py-[var(--space-section)]">
      <div className="container mx-auto px-6">
        <div className="grid items-center gap-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative">
            <div className="border-border bg-surface-subtle group relative mx-auto aspect-square max-w-[34rem] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-lg)]">
              <OptimizedMedia
                src={profile?.url}
                alt={
                  profile?.is_decorative
                    ? ""
                    : profile?.alt_text || "Abstract portfolio identity visual"
                }
                fallback="profile"
                className="object-cover transition-transform duration-[var(--motion-slow)] group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <div className="from-background/70 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
            </div>
            <div className="border-border bg-card absolute right-4 -bottom-9 left-4 mx-auto max-w-xs rounded-2xl border p-5 shadow-[var(--shadow-md)] lg:right-8 lg:left-auto">
              <Layers3 className="text-primary size-7" aria-hidden="true" />
              <p className="mt-3 text-sm leading-6 font-semibold">
                {site.positioning.client_promise ||
                  `${pillars.length} disciplines connected around one product outcome.`}
              </p>
            </div>
          </div>

          <div>
            <SectionTitle variant="none" className="mb-7 items-start text-left">
              <Subtitle>About the practice</Subtitle>
              <Title>
                {site.positioning.compact || "Connected product engineering"}
              </Title>
            </SectionTitle>
            <p className="text-muted-foreground text-lg leading-8">
              {site.positioning.short_bio ||
                site.positioning.long_bio ||
                "Published practice details are being prepared."}
            </p>
            <ol
              className="mt-8 grid gap-3 sm:grid-cols-2"
              aria-label="Five-discipline practice"
            >
              {pillars.map((pillar) => (
                <li
                  key={pillar.key}
                  className="border-border flex min-h-12 items-center gap-3 rounded-xl border px-4 text-sm font-bold"
                >
                  <span className="text-primary text-xs tabular-nums">
                    {String(pillar.order).padStart(2, "0")}
                  </span>
                  {pillar.label}
                </li>
              ))}
            </ol>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/about"
                className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-sm font-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Explore the approach
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/projects"
                className="border-border hover:border-primary focus-visible:ring-primary inline-flex min-h-12 items-center gap-2 rounded-xl border px-6 text-sm font-black focus-visible:ring-2 focus-visible:outline-none"
              >
                See selected work
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
