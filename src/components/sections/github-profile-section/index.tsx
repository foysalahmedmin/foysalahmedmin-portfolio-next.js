import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { SectionHead } from "@/components/sections/signal/section-head";
import { buttonVariants } from "@/components/ui/button-variants";
import type { ContributionCalendar } from "@/lib/github/contributions";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";

// Only a real github.com profile URL is ever linked, so a mistyped or hostile
// value in the Site settings cannot turn this section into an arbitrary link.
export const toGithubHandle = (url: string): string | null => {
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

const formatDay = (date: string, count: number) =>
  `${count} ${count === 1 ? "contribution" : "contributions"} on ${new Intl.DateTimeFormat(
    "en",
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
  ).format(new Date(`${date}T00:00:00Z`))}`;

/** The year of contributions as a grid of dots: seven rows, one column per week, five tones of ink. */
const ContributionDots = ({
  calendar,
  handle,
}: {
  calendar: ContributionCalendar;
  handle: string;
}) => (
  <figure
    className="dots"
    aria-label={`${calendar.total.toLocaleString("en")} public contributions by ${handle} in the last year`}
  >
    <div className="dots-scroll">
      <div className="dots-frame">
        <div
          className="dots-months"
          aria-hidden="true"
          style={{ "--weeks": calendar.weeks.length } as CSSProperties}
        >
          {calendar.months.map((month) => (
            <span
              key={`${month.label}-${month.week}`}
              style={{ gridColumnStart: month.week + 1 }}
            >
              {month.label}
            </span>
          ))}
        </div>
        <div
          className="dots-grid"
          aria-hidden="true"
          style={{ "--weeks": calendar.weeks.length } as CSSProperties}
        >
          {calendar.weeks.flatMap((week, weekIndex) =>
            week.map((day, dayIndex) =>
              day ? (
                <span
                  key={day.date}
                  className="dot"
                  data-level={day.level}
                  title={formatDay(day.date, day.count)}
                />
              ) : (
                <span key={`${weekIndex}-${dayIndex}`} className="dot-gap" />
              )
            )
          )}
        </div>
      </div>
    </div>
    <figcaption className="dots-legend">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className="dot"
          data-level={level}
          aria-hidden="true"
        />
      ))}
      <span>More</span>
    </figcaption>
  </figure>
);

export default function GithubProfileSection({
  site,
  heading,
  calendar = null,
}: {
  site: TPublicSiteDto;
  heading?: string;
  /** The contribution calendar, when it could be read; the section is a plain profile link without it. */
  calendar?: ContributionCalendar | null;
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
      <div className="container grid gap-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            eyebrow="Open code"
            title={heading || "See how I build, in the open"}
            titleId="github-heading"
            lead={
              calendar
                ? `${calendar.total.toLocaleString("en")} public contributions in the last year. Reading real code is the fastest way to judge how someone works.`
                : "Reading real code is the fastest way to judge how someone works. Follow my public repositories for the projects, experiments and fixes behind these case studies."
            }
          />
          <a
            href={`https://github.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "lg" })}
          >
            View @{handle} on GitHub
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        {calendar && <ContributionDots calendar={calendar} handle={handle} />}
      </div>
    </section>
  );
}
