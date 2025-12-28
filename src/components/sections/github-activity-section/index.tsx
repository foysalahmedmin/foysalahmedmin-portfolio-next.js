"use client";

import { SectionTitle, Subtitle, Title } from "@/components/ui/section-title";
import { useIsDark } from "@/hooks/ui/use-is-dark";
import Link from "next/link";
import React from "react";
import { GitHubCalendar } from "react-github-calendar";
import { Tooltip } from "react-tooltip";

const GithubActivitySection = () => {
  const isDark = useIsDark();
  const theme = isDark ? "dark" : "light";

  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <SectionTitle>
          <Subtitle>Open Source</Subtitle>
          <Title>GitHub Contributions</Title>
        </SectionTitle>

        <div className="fade-up border-border bg-card/50 hover:border-primary/50 mx-auto flex max-w-5xl justify-center rounded-2xl border p-8 shadow-sm transition-all delay-200 duration-300 hover:shadow-md">
          <GitHubCalendar
            username="foysalahmedmin"
            colorScheme={theme === "dark" ? "dark" : "light"}
            fontSize={14}
            blockSize={14}
            blockMargin={4}
            renderBlock={(block, activity) => (
              <Tooltip
                id="github-tooltip"
                content={`${activity.count} activities on ${activity.date}`}
                place="top"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "12px",
                  zIndex: 9999,
                }}
              >
                {React.cloneElement(block, {
                  "data-tooltip-id": "github-tooltip",
                })}
              </Tooltip>
            )}
          />
        </div>

        <div className="fade-up mt-8 flex justify-center delay-300">
          <Link
            href="https://github.com/foysalahmedmin"
            target="_blank"
            className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
          >
            Visit my GitHub Profile →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GithubActivitySection;
