import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import { FAQSection } from "@/components/sections/evidence-sections";
import PillarShowcaseSection from "@/components/sections/pillar-showcase-section";
import ArchitectureWorkflowSection from "@/components/sections/architecture-workflow-section";
import GithubProfileSection from "@/components/sections/github-profile-section";
import ProcessStepsSection from "@/components/sections/process-steps-section";
import { parseContributionCalendar } from "@/lib/github/contributions";

export const metadata = { title: "Sections lab" };

/**
 * The home sections with realistic sample copy, in one place, so layout work can be seen without a
 * seeded database. Served where the Motion lab is (development, or MOTION_LAB=1).
 */
const site = createEmergencyPublicSite();

const pillars = site.pillars.map((pillar, index) => ({
  ...pillar,
  client_outcome: [
    "A clear plan that lowers risk, rework and running cost before the build starts.",
    "A working, maintainable product that your team and your users can rely on.",
    "Repetitive work handled by automation you can monitor and switch off.",
  ][index],
  capabilities: [
    [
      "Architecture and technical decision records",
      "Database and data-model design",
      "Cloud, CI/CD and release strategy",
      "Security, reliability and cost reviews",
    ],
    [
      "Web applications and dashboards",
      "APIs, authentication and data layers",
      "Admin panels and internal tools",
      "Testing, accessibility and performance",
    ],
    [
      "Workflow and integration automation",
      "LLM-assisted features with human review",
      "Background jobs and data pipelines",
      "Monitoring, logging and safe fallbacks",
    ],
  ][index]!,
  technologies: [
    ["MongoDB", "PostgreSQL", "Redis", "Docker", "GitHub Actions", "Vercel"],
    ["Next.js", "React", "TypeScript", "Node.js", "Express", "Tailwind CSS"],
    ["Node.js", "TypeScript", "Python", "Redis", "RabbitMQ", "LLM APIs"],
  ][index]!,
}));

const steps = [
  [
    "Understand the problem",
    "Start from the business goal, the people affected and the constraint that hurts most, before choosing any technology.",
    "Problem brief and success measures",
  ],
  [
    "Shape the solution",
    "Compare realistic options, pick the simplest one that works and write down why.",
    "Solution outline and decision record",
  ],
  [
    "Build in small steps",
    "Ship working increments you can review early, instead of one big reveal at the end.",
    "Reviewable releases and automated tests",
  ],
  [
    "Make it dependable",
    "Check security, accessibility and performance so the solution holds up under real use.",
    "Quality and security review notes",
  ],
  [
    "Launch and hand over",
    "Release through automated pipelines with monitoring in place, and hand over documentation your team can run with.",
    "Production release and handover notes",
  ],
  [
    "Measure and improve",
    "Watch the numbers that mattered at the start and keep improving what moves them.",
    "Outcome review and next-step plan",
  ],
].map(([title, summary, deliverable], index) => ({
  key: `step-${index}`,
  title: `${index + 1}. ${title}`,
  summary,
  deliverable,
  enabled: true,
}));

const faqs = [
  [
    "What kinds of problems can you help with?",
    "Usually one of three: a system whose design is unclear or fragile, a product that needs to be built or rescued, or repetitive manual work that automation could take over.",
  ],
  [
    "How does a project start?",
    "With a short conversation about the problem, the people affected and what success looks like. From that I propose a simple plan with milestones.",
  ],
  [
    "Do I need a technical background to work with you?",
    "No. I explain decisions and trade-offs in plain language and ask for business context first.",
  ],
  [
    "What will I actually receive?",
    "Working software or a written architecture you can act on, plus the reasoning behind it, so your team can extend the result without depending on me.",
  ],
].map(([question, answer], index) => ({
  slug: `faq-${index}`,
  question,
  answer: `<p>${answer}</p>`,
})) as unknown as TPublicFAQDto[];

// A year of made-up days, so the dot calendar can be seen without the network
const calendar = parseContributionCalendar({
  contributions: Array.from({ length: 365 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 9, 26) - (364 - index) * 86_400_000);
    const weekday = date.getUTCDay();
    const wave = Math.sin(index / 9) + Math.sin(index / 23 + 1);
    const count =
      weekday === 0 || weekday === 6
        ? Math.max(0, Math.round(wave * 2 - 1))
        : Math.max(0, Math.round(wave * 5 + 2 + (index % 7)));
    return { date: date.toISOString().slice(0, 10), count };
  }),
});

const siteWithGithub = {
  ...site,
  social_links: [
    {
      key: "github",
      platform: "github",
      label: "GitHub",
      url: "https://github.com/foysalahmedmin",
      enabled: true,
    },
  ],
} as unknown as typeof site;

export default function SectionsLabPage() {
  return (
    <main>
      <PillarShowcaseSection pillars={pillars} />
      <ProcessStepsSection steps={steps} />
      <ArchitectureWorkflowSection site={{ ...site, process: steps }} />
      <FAQSection faqs={faqs} />
      <GithubProfileSection site={siteWithGithub} calendar={calendar} />
    </main>
  );
}
