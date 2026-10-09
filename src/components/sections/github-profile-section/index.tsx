import type { TPublicSiteDto } from "@/app/api/site/site.type";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { ArrowUpRight, GitBranch } from "lucide-react";

// Only a real github.com profile URL is ever linked, so a mistyped or hostile
// value in the Site settings cannot turn this section into an arbitrary link.
const toGithubHandle = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") {
      return null;
    }
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle && /^[A-Za-z0-9-]{1,39}$/.test(handle) ? handle : null;
  } catch {
    return null;
  }
};

export default function GithubProfileSection({
  site,
  heading,
}: {
  site: TPublicSiteDto;
  heading?: string;
}) {
  const link = site.social_links.find(
    (item) => item.platform === "github" && item.enabled
  );
  const handle = link ? toGithubHandle(link.url) : null;
  if (!link || !handle) return null;

  return (
    <section
      id="github"
      aria-labelledby="github-heading"
      className="py-[var(--space-section)]"
    >
      <div className="container">
        <SectionTitle>
          <Subtitle>Open code</Subtitle>
          <Title id="github-heading">
            {heading || "See how I build, in the open"}
          </Title>
          <Description>
            Reading real code is the fastest way to judge how someone works.
            Follow my public repositories for the projects, experiments, and
            fixes behind these case studies.
          </Description>
        </SectionTitle>

        <div className="border-border bg-card mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-[var(--radius-xl-token)] border p-8 text-center shadow-[var(--shadow-sm)]">
          <span className="bg-primary/10 text-primary inline-grid size-14 place-items-center rounded-xl">
            <GitBranch className="size-7" aria-hidden="true" />
          </span>
          <a
            href={`https://github.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-sm font-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            View @{handle} on GitHub
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
