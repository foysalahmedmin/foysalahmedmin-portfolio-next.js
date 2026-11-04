import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { readContributionCalendar } from "@/lib/github/contributions";
import GithubProfileSection, { toGithubHandle } from "./index";

/** The GitHub section with its contribution calendar, read on the server (cached for six hours). */
export default async function GithubProfileSectionLive({
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
  const calendar = handle ? await readContributionCalendar(handle) : null;
  return (
    <GithubProfileSection
      site={site}
      calendar={calendar}
      {...(heading ? { heading } : {})}
    />
  );
}
