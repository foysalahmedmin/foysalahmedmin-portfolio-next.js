import type { PillarKey } from "../content/pillars.ts";

// Launch content for the Case study and Video libraries.
//
// Case studies retell engineering work that really exists in this repository
// in the problem-first shape the public site uses; outcomes are "derived"
// because each can be checked against the code, and none names a client,
// revenue, or traffic. Videos are public YouTube videos chosen to match the
// three roles. They are credited to their channels and meant as placeholders
// until the owner publishes their own from Admin → Videos.

export type LaunchCaseStudyCategory = Readonly<{
  name: string;
  slug: string;
  description: string;
  sequence: number;
}>;

export type LaunchCaseStudy = Readonly<{
  name: string;
  category: string;
  description: string;
  overview: string;
  pillar: PillarKey;
  industry: string;
  role: string;
  duration: string;
  challenge: string;
  approach: string;
  decisions: readonly string[];
  solution: string;
  results: string;
  outcomes: readonly { label: string; value: string; description?: string }[];
  tools: readonly string[];
  services: readonly string[];
  learnings: readonly string[];
  keywords: readonly string[];
}>;

export type LaunchVideoCategory = LaunchCaseStudyCategory;

export type LaunchVideo = Readonly<{
  name: string;
  category: string;
  url: string;
  aspect: "landscape" | "reel";
  description: string;
  keywords: readonly string[];
}>;

export const LAUNCH_CASE_STUDY_CATEGORIES: readonly LaunchCaseStudyCategory[] =
  [
    {
      name: "Platform builds",
      slug: "platform-builds",
      description: "Products built end to end, from data model to release.",
      sequence: 1,
    },
    {
      name: "Operations and automation",
      slug: "operations-and-automation",
      description:
        "The safety nets and routines that keep a live system healthy.",
      sequence: 2,
    },
  ];

export const LAUNCH_CASE_STUDIES: readonly LaunchCaseStudy[] = [
  {
    name: "From hand-edited pages to a site that publishes itself safely",
    category: "platform-builds",
    description:
      "How a portfolio became editable without code and stopped showing anything that had not been reviewed.",
    overview:
      "This website is its own first case study. It started as pages edited by hand in code and became a small publishing platform: content lives in a database, every change is a draft first, and a page only goes live after its whole content graph passes a check.",
    pillar: "software_developer",
    industry: "Software and publishing",
    role: "Product design, data model, admin workspace, public site and release pipeline.",
    duration: "Built over many small releases",
    challenge:
      "Every wording change meant editing code and redeploying, and nothing stopped an unfinished or unverified statement from reaching visitors. The owner needed to update the site alone, quickly, while keeping a strict line between what is approved and what is not.",
    approach:
      "Treat publishing as a step with rules, not an edit to a live page. Content is written as a draft, previewed privately, and published as a numbered revision. A page can only be published when every project, article, service or video it shows is itself publicly eligible.",
    decisions: [
      "Publish immutable revisions instead of editing live pages",
      "Keep unverified claims and results off public pages",
      "Describe every page as typed sections, so layout changes cannot break the site",
      "Hold every permission in one capability table that the server enforces",
    ],
    solution:
      "A Next.js application on MongoDB with an admin workspace for the site profile, nine fixed pages, projects, case studies, articles and videos. Each page is an ordered list of typed sections that read published content, previews are private, and every change is written to an audit log.",
    results:
      "The owner can change copy, add a case study or publish a video without a developer or a redeploy, and visitors only ever see reviewed content. The same structure now carries case studies and videos without new plumbing.",
    outcomes: [
      {
        label: "Redeploys needed to change public content",
        value: "None",
        description: "Published revisions refresh the public cache directly.",
      },
      {
        label: "Content that reaches visitors before review",
        value: "None",
        description:
          "A page is only published when its whole content graph is eligible.",
      },
    ],
    tools: ["Next.js", "TypeScript", "MongoDB", "Zod", "Tailwind CSS"],
    services: ["Product design", "Data modelling", "Admin tooling"],
    learnings: [
      "A publish step with rules is worth more than a polished editor.",
      "Typed sections make layout flexible without making it fragile.",
    ],
    keywords: ["publishing", "content management", "Next.js"],
  },
  {
    name: "Moving a live database forward without downtime or surprises",
    category: "operations-and-automation",
    description:
      "A migration pipeline that makes changing production data a deliberate, repeatable and reversible step.",
    overview:
      "A single operator, a single production database and no operations team: every schema change had to be safe to run, easy to verify and hard to get wrong.",
    pillar: "system_architect",
    industry: "Software and publishing",
    role: "Designed the migration runner, its safety gates and its dry-run reports.",
    duration: "Designed up front, extended with each release",
    challenge:
      "Changing a live database is risky: a bad index or a half-applied change can take content offline, and there is rarely a clean way back. With nobody else to catch a mistake, the process itself had to catch it.",
    approach:
      "Make every change a versioned migration in an ordered registry. Each migration describes what it will do before it does it, records a checksum when applied, and takes an exclusive lease so two runs can never overlap.",
    decisions: [
      "Require a dry run that reports what would change before anything is applied",
      "Block destructive steps unless a fresh backup reference is supplied",
      "Record the checksum of every applied migration and refuse to continue if one has drifted",
      "Make every step idempotent so a repeat run changes nothing",
    ],
    solution:
      "A command-line runner that applies the registry in order, reports the state of every index per collection, and verifies the end state before it marks a migration as applied. Indexes are compared with what the database reports, not what was requested.",
    results:
      "Schema changes ship as small, reviewed steps. A repeat run reports 'skipped' instead of touching data, and a destructive change cannot start without a verified way back.",
    outcomes: [
      {
        label: "Changes that start without a dry run",
        value: "None",
      },
      {
        label: "Destructive steps without a backup reference",
        value: "Blocked",
      },
      {
        label: "Effect of running the same migration twice",
        value: "No change",
      },
    ],
    tools: ["MongoDB", "TypeScript", "Node.js"],
    services: ["System design", "Operations tooling", "Release safety"],
    learnings: [
      "Text indexes come back from the database in a different shape than they were created, so comparisons must normalise them.",
      "Run risky queries against a real server: mocks accept anything.",
    ],
    keywords: ["migrations", "reliability", "databases"],
  },
  {
    name: "Letting visitors reach out without opening the inbox to abuse",
    category: "platform-builds",
    description:
      "A public contact flow that slows spam down without ever losing a real enquiry.",
    overview:
      "A contact form is the one place anyone on the internet can write to the owner. It has to welcome real people, resist bots and keep personal data only as long as it is needed.",
    pillar: "software_developer",
    industry: "Software and publishing",
    role: "Built the form, the server-side validation, the delivery queue and the retention rules.",
    duration: "Built once, tuned as traffic patterns showed up",
    challenge:
      "Public forms attract spam, and a form that is too strict loses real enquiries while a careless one exposes the inbox or stores personal data forever. There was no budget for a third-party form service.",
    approach:
      "Validate everything on the server, store each submission with a receipt before sending anything, and deliver by email through a retry queue. Slow abuse down quietly with timing and honeypot checks instead of visible puzzles.",
    decisions: [
      "Use timing and honeypot checks instead of visible CAPTCHAs",
      "Store a receipt first so a retry can never duplicate a message",
      "Keep IP addresses and sessions only as keyed hashes",
      "Anonymise personal data after the retention period",
    ],
    solution:
      "Same-origin checks, a bounded request size, per-IP and per-session rate limits, an idempotent write, and an outbox that keeps the enquiry even when the email provider is down and retries delivery later.",
    results:
      "A visitor's message always arrives, abuse is slowed down without punishing real people, and old personal data expires on its own.",
    outcomes: [
      {
        label: "Enquiries lost when email delivery fails",
        value: "None",
        description: "The enquiry is stored first and delivery is retried.",
      },
      {
        label: "Personal data after the retention period",
        value: "Anonymised",
      },
    ],
    tools: ["Next.js", "MongoDB", "Nodemailer", "Upstash (optional)"],
    services: ["Form design", "Abuse protection", "Data retention"],
    learnings: [
      "Availability matters as much as protection: a limiter that fails closed can lock the owner out.",
    ],
    keywords: ["forms", "rate limiting", "privacy"],
  },
  {
    name: "Automating the routine upkeep nobody remembers to do",
    category: "operations-and-automation",
    description:
      "Small, safe background jobs that retry emails, expire old data and tidy stored files on a schedule.",
    overview:
      "Routine upkeep is easy to forget and easy to get wrong by hand. The goal was automation that a person can see, limit and switch off.",
    pillar: "ai_automation",
    industry: "Software and publishing",
    role: "Designed the worker routes, their batching and their failure handling.",
    duration: "Added one job at a time",
    challenge:
      "Retrying failed emails, deleting expired personal data and cleaning orphaned files are chores that quietly stop happening, and automation that cannot be paused becomes its own risk.",
    approach:
      "Give each chore a small authenticated worker route that a scheduler calls on a timer. Each processes a bounded batch, records the outcome of every attempt and is safe to run twice.",
    decisions: [
      "Process work in bounded batches so a mistake stays small",
      "Cap retries and keep the failure reason",
      "Authenticate every call with a bearer secret",
      "Make every job idempotent before scheduling it",
    ],
    solution:
      "An outbox worker for email delivery, a retention worker for expiring personal data and a reconciler for stored media. A failed item is retried a limited number of times and then surfaced for attention instead of looping forever.",
    results:
      "The recurring chores happen without anyone remembering them, and each one leaves a trail that can be reviewed or stopped.",
    outcomes: [
      {
        label: "Retries before a failing item is surfaced",
        value: "5",
      },
      {
        label: "Jobs that are safe to run twice",
        value: "All",
      },
    ],
    tools: ["Next.js route handlers", "MongoDB", "Scheduled jobs"],
    services: ["Workflow automation", "Monitoring", "Failure handling"],
    learnings: [
      "Make every job idempotent first; scheduling it is the easy part.",
      "Automation earns trust when a person can see it and stop it.",
    ],
    keywords: ["automation", "queues", "reliability"],
  },
];

export const LAUNCH_VIDEO_CATEGORIES: readonly LaunchVideoCategory[] = [
  {
    name: "Recommended watching",
    slug: "recommended-watching",
    description:
      "Videos worth your time on architecture, development and automation.",
    sequence: 1,
  },
  {
    name: "Quick explainers",
    slug: "quick-explainers",
    description: "One-minute vertical explainers on a single idea.",
    sequence: 2,
  },
];

export const LAUNCH_VIDEOS: readonly LaunchVideo[] = [
  {
    name: "System design crash course: scaling from 100 to 100M users",
    category: "recommended-watching",
    url: "https://www.youtube.com/watch?v=fwVGulYwlak",
    aspect: "landscape",
    description:
      "A walkthrough of how a system grows from one server to millions of users: caching, queues, sharding and resilience. A good picture of the thinking behind the architecture work I do.\n\nVideo by System Design Lab on YouTube.",
    keywords: ["system design", "scalability", "architecture"],
  },
  {
    name: "Next.js in 100 seconds, plus a full beginner's tutorial",
    category: "recommended-watching",
    url: "https://www.youtube.com/watch?v=Sklc_fQBmcs",
    aspect: "landscape",
    description:
      "A fast overview of Next.js followed by a hands-on tutorial for a first server-rendered React app. The framework behind this website.\n\nVideo by Fireship on YouTube.",
    keywords: ["Next.js", "React", "web development"],
  },
  {
    name: "n8n quick start: build your first workflow",
    category: "recommended-watching",
    url: "https://www.youtube.com/watch?v=4cQWJViybAQ",
    aspect: "landscape",
    description:
      "How a first automation comes together in n8n, from a trigger to the steps that do the work. A friendly start to workflow automation.\n\nVideo by n8n on YouTube.",
    keywords: ["n8n", "workflow automation", "no-code"],
  },
  {
    name: "Software architecture vs. design: the key differences",
    category: "quick-explainers",
    url: "https://www.youtube.com/shorts/aF1BAVVN1-U",
    aspect: "reel",
    description:
      "Where architecture ends and design begins, in under a minute.\n\nVideo by Otavio Santana on YouTube.",
    keywords: ["software architecture", "design"],
  },
  {
    name: "Software architecture patterns at a glance",
    category: "quick-explainers",
    url: "https://www.youtube.com/shorts/bYOfZehFP-E",
    aspect: "reel",
    description:
      "Layered, event-driven, microservices and more, side by side.\n\nVideo by DigitalTechSolutions on YouTube.",
    keywords: ["architecture patterns", "microservices"],
  },
  {
    name: "REST API basics in 60 seconds",
    category: "quick-explainers",
    url: "https://www.youtube.com/shorts/p57YVW_Pv68",
    aspect: "reel",
    description:
      "Endpoints, methods and JSON explained in one minute.\n\nVideo by BMR Education on YouTube.",
    keywords: ["REST", "API", "JSON"],
  },
  {
    name: "Automate a workflow in 60 seconds with n8n",
    category: "quick-explainers",
    url: "https://www.youtube.com/shorts/wwl0sCjZ5bg",
    aspect: "reel",
    description:
      "A one-minute taste of what workflow automation can take off your plate.\n\nVideo by Ynteractive AI on YouTube.",
    keywords: ["n8n", "automation"],
  },
];
