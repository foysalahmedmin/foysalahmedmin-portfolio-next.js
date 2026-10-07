import type { PillarKey } from "../content/pillars.ts";

// Launch content: case studies and notes taken from engineering work that
// really exists in this repository, written in the problem-first shape the
// public site uses. Outcomes are marked "derived" because each one can be
// checked against the codebase; none claims a client, revenue, or traffic.

export type LaunchProject = Readonly<{
  name: string;
  description: string;
  pillar: PillarKey;
  tags: readonly string[];
  problem: string;
  constraints: readonly string[];
  role: string;
  architecture: string;
  decisions: readonly string[];
  implementation: string;
  security: string;
  performance_reliability: string;
  outcomes: readonly { label: string; value: string }[];
  learnings: readonly string[];
  body: string;
}>;

export type LaunchArticle = Readonly<{
  name: string;
  excerpt: string;
  pillar: PillarKey;
  topics: readonly string[];
  minutes: number;
  body: string;
}>;

export const LAUNCH_PROJECTS: readonly LaunchProject[] = [
  {
    name: "Portfolio publishing platform",
    description:
      "A portfolio that stays editable without code changes and never shows a claim it cannot back up.",
    pillar: "software_developer",
    tags: ["Next.js", "MongoDB", "TypeScript", "Admin workspace"],
    problem:
      "A portfolio has to look polished, stay editable without a developer, and protect its owner's data, yet most site builders either lock content in a vendor or publish whatever is typed in. The owner needed a site where every public statement had been reviewed first.",
    constraints: [
      "One owner acting as the only author",
      "No budget for a separate CMS subscription",
      "Public pages must stay fast and indexable",
    ],
    role: "Designed and built the platform end to end: data model, admin workspace, public site, and release pipeline.",
    architecture:
      "A Next.js application on a MongoDB data layer. Content is edited as drafts and published as immutable revisions, so visitors only ever see content that has been reviewed.",
    decisions: [
      "Publish revisions instead of editing live pages",
      "Keep unverified claims off public pages",
      "Hold every permission in one capability table",
    ],
    implementation:
      "Typed API routes with schema validation, a transactional publish flow, an admin workspace with audit history, and cached public reads that refresh when content is published.",
    security:
      "Administrators must pass multi-factor verification in production, sessions rotate on every refresh, and every change is written to an audit log.",
    performance_reliability:
      "Public pages are cached and revalidated on publish. Rate limits fall back to per-instance counting instead of taking sign-in offline when the shared store is unavailable.",
    outcomes: [
      { label: "Automated tests passing", value: "860" },
      { label: "Schema migrations applied from an empty database", value: "15" },
    ],
    learnings: [
      "A seed needs its own tests: one that fails its own schema stays hidden until the first real run.",
      "Compare against what the database reports, not what you asked it to create.",
    ],
    body: "<p>This case study describes the platform that powers this website: a content system that treats publishing as a reviewed, reversible step rather than an edit to a live page.</p>",
  },
  {
    name: "Safe schema-migration pipeline",
    description:
      "Database changes on a live site, with a dry run, a lock, and a clear way back.",
    pillar: "system_architect",
    tags: ["MongoDB", "Migrations", "Operations"],
    problem:
      "Changing a live database is risky: a bad index or a half-applied change can take content offline, and there is rarely a clean way back. A single operator needed to ship schema changes without a dedicated operations team.",
    constraints: [
      "A single production database",
      "No dedicated operations team",
    ],
    role: "Designed the migration runner, its safety gates, and the dry-run reports.",
    architecture:
      "An ordered registry of versioned migrations. Each has a dry-run summary, a checksum, and an exclusive lease so two runs can never overlap.",
    decisions: [
      "Require a dry run before any change",
      "Block destructive steps unless a fresh backup reference is supplied",
      "Record the checksum of every applied migration",
    ],
    implementation:
      "A command-line runner that applies the registry in order, reports index state per collection, and refuses to continue when a definition has drifted from what was recorded.",
    security:
      "Destructive migrations need a verified backup reference no older than a day, and connection strings never appear in the output.",
    performance_reliability:
      "Each step is idempotent, so a repeat run reports 'skipped' instead of changing anything.",
    outcomes: [
      { label: "Migrations in the registry", value: "15" },
      { label: "Applied cleanly to an empty database in a single run", value: "Yes" },
    ],
    learnings: [
      "Text indexes come back from the database in a different shape than they were created, so comparisons must normalise them.",
      "Test migrations against a real server: some queries only fail there.",
    ],
    body: "<p>A migration pipeline built so that changing the database is a deliberate, reviewable, repeatable step.</p>",
  },
  {
    name: "Contact intake with abuse protection",
    description:
      "A public contact form that resists spam without losing real enquiries.",
    pillar: "software_developer",
    tags: ["Forms", "Rate limiting", "Email delivery"],
    problem:
      "A public contact form attracts spam and bots, but a form that is too strict loses real enquiries and a careless one exposes the owner's inbox.",
    constraints: [
      "No third-party form service",
      "Personal data must expire after a set period",
    ],
    role: "Built the form, the server-side validation, the delivery queue, and the retention rules.",
    architecture:
      "Submissions are validated on the server, stored with a receipt, and delivered by email through a retry queue (an outbox).",
    decisions: [
      "Use timing and honeypot checks instead of visible CAPTCHAs",
      "Store a receipt so a retry never duplicates a message",
      "Anonymise personal data after the retention period",
    ],
    implementation:
      "Same-origin checks, a bounded request size, per-IP and per-session rate limits, and an idempotent write that keeps the enquiry even when email delivery fails.",
    security:
      "IP addresses and sessions are stored only as keyed hashes, and requests from untrusted origins are rejected.",
    performance_reliability:
      "If the email provider is down the enquiry is kept and retried later, so a visitor's message is never lost.",
    outcomes: [
      { label: "Rate-limit stores supported", value: "Shared (Upstash) or per-instance" },
    ],
    learnings: [
      "Availability matters as much as protection: a limiter that fails closed can lock the owner out of their own site.",
    ],
    body: "<p>A contact flow designed so that a real message always arrives, and abuse is slowed down without punishing real visitors.</p>",
  },
  {
    name: "Admin sign-in with multi-factor verification",
    description:
      "Protecting the most attractive target on a small site without locking the owner out.",
    pillar: "system_architect",
    tags: ["Authentication", "Sessions", "TOTP"],
    problem:
      "An admin panel on the public internet is the most attractive target on a small site, and the one place where a mistake locks the owner out of their own content.",
    constraints: ["A single administrator", "The owner must never be locked out"],
    role: "Designed the sign-in flow, session handling, and recovery path.",
    architecture:
      "Short-lived access tokens with rotating refresh sessions, plus a TOTP second factor with recovery codes. Enrollment happens inside the sign-in flow.",
    decisions: [
      "Rotate refresh sessions and revoke the whole family on reuse",
      "Encrypt second-factor secrets with a dedicated key",
      "Make the second factor mandatory in production",
    ],
    implementation:
      "Server-side session records, encrypted TOTP seeds, hashed recovery codes, and rate limits per account, IP address, and challenge.",
    security:
      "Passwords are hashed, secrets never leave the server, and sign-in errors do not reveal whether an account exists.",
    performance_reliability:
      "Enrollment is offered automatically on first sign-in, so turning the second factor on cannot lock out an administrator who has not set it up.",
    outcomes: [
      { label: "Sign-in rate limits", value: "Per account, IP and challenge" },
    ],
    learnings: ["Check the lockout path before switching a security setting on."],
    body: "<p>A sign-in design that raises the cost of an attack while keeping the owner's recovery path intact.</p>",
  },
  {
    name: "Media management with swappable storage",
    description:
      "Uploading, reviewing and serving files safely without locking the site to one cloud provider.",
    pillar: "software_developer",
    tags: ["Cloudinary", "Google Cloud Storage", "Uploads"],
    problem:
      "Images and documents need to be uploaded, reviewed, and served safely, without tying the site to a single cloud provider or exposing private files such as a resume.",
    constraints: [
      "Private files must never be public",
      "Uploads must be size-bounded",
    ],
    role: "Built the upload pipeline and the storage adapters.",
    architecture:
      "A provider-neutral storage interface with Cloudinary and Google Cloud Storage adapters. Every file records which provider owns it.",
    decisions: [
      "Store the provider on every file record",
      "Check every upload against its purpose and size before storing it",
      "Reconcile storage and database on a schedule",
    ],
    implementation:
      "Bounded multipart uploads, purpose checks for hero, social, and document files, accessibility text on public images, and a scheduled reconciler that finds orphans.",
    security:
      "Private documents live in a separate non-public bucket and are only reachable through short-lived delivery URLs.",
    performance_reliability:
      "Deleting a file always uses the provider stored on that file, so a provider switch never strands old files.",
    outcomes: [
      { label: "Storage providers supported", value: "2" },
    ],
    learnings: ["Record the provider per file from day one; adding it later is much harder."],
    body: "<p>A storage layer that treats the cloud provider as a replaceable detail.</p>",
  },
  {
    name: "Background automation for routine upkeep",
    description:
      "Retrying failed emails, expiring personal data, and cleaning orphaned files without anyone remembering to.",
    pillar: "ai_automation",
    tags: ["Automation", "Queues", "Scheduled jobs"],
    problem:
      "Routine upkeep such as retrying failed emails, deleting expired personal data, and cleaning orphaned files is easy to forget and easy to get wrong when done by hand.",
    constraints: [
      "Jobs must be safe to run twice",
      "Only a trusted scheduler may trigger them",
    ],
    role: "Designed the worker routes, their batching, and their failure handling.",
    architecture:
      "Small authenticated worker routes that a scheduler calls on a timer. Each processes a bounded batch and records the outcome of every attempt.",
    decisions: [
      "Process work in bounded batches",
      "Cap retries and keep the failure reason",
      "Authenticate every call with a bearer secret",
    ],
    implementation:
      "An outbox worker for email delivery, a retention worker for expiring personal data, and a reconciler for stored media, all idempotent so a repeated call changes nothing.",
    security:
      "Worker routes reject any call without the scheduler's secret and never expose personal data in their responses.",
    performance_reliability:
      "A failed item is retried a limited number of times and then surfaced for attention rather than retried forever.",
    outcomes: [
      { label: "Retries before an item is surfaced", value: "5" },
    ],
    learnings: ["Make every job idempotent first; scheduling it is the easy part."],
    body: "<p>Automation that removes recurring chores while staying observable and easy to switch off.</p>",
  },
];

export const LAUNCH_ARTICLES: readonly LaunchArticle[] = [
  {
    name: "Keep sign-in working when a protection service is down",
    excerpt:
      "A rate limiter that fails closed can lock the owner out. Here is how to keep protection and availability together.",
    pillar: "system_architect",
    topics: ["availability", "security"],
    minutes: 3,
    body: "<p>Rate limits protect sign-in from guessing attacks. The usual setup stores the counters in a shared service. If that service is unreachable, a cautious design refuses every request, which means one outage takes the whole admin offline.</p><h2>The trade-off</h2><p>Failing closed is safest for a bank. For a one-owner site, being locked out of your own content is the bigger risk. The better rule is to use the shared store when it is configured and healthy, and otherwise count attempts inside the running instance.</p><h2>What changes</h2><p>Protection is slightly weaker across several instances, because each counts on its own, but sign-in stays available. Once the shared store is configured again, it takes over automatically with no code change.</p>",
  },
  {
    name: "Why a seed that fails its own schema stays hidden",
    excerpt:
      "Sample data that nobody tests breaks the first time it runs for real. A cheap check catches it earlier.",
    pillar: "software_developer",
    topics: ["testing", "data"],
    minutes: 3,
    body: "<p>Seed data feels like setup, not code, so it often goes untested. Then the day comes to load it into a fresh database and the whole run fails, because a few records no longer match the rules the application enforces.</p><h2>A cheap safeguard</h2><p>Validate every seed record against the same schema the application uses, in an ordinary unit test. It takes a few lines and fails the moment the data and the rules drift apart.</p><h2>The lesson</h2><p>Anything that must work on the first real run deserves a test that runs long before it.</p>",
  },
  {
    name: "A database query that only failed on the real server",
    excerpt:
      "Some mistakes pass every mocked test and only surface against a real database. Test against the real thing.",
    pillar: "system_architect",
    topics: ["databases", "testing"],
    minutes: 3,
    body: "<p>A migration used a query operator that looks right but is not valid on the database server. Unit tests that mocked the database passed. The command failed the first time it ran against a real server.</p><h2>Why mocks miss it</h2><p>A mock accepts any query. Only the real server knows which operators are legal.</p><h2>The fix</h2><p>Run the risky queries against a real database in an integration test. A throwaway local server is enough, and it turns a production surprise into a failing test.</p>",
  },
  {
    name: "When the code and the migrations disagree about a table name",
    excerpt:
      "Content that was saved correctly but never appeared on the site: a naming mismatch hiding in plain sight.",
    pillar: "software_developer",
    topics: ["databases", "debugging"],
    minutes: 3,
    body: "<p>Seeded content was in the database but the site showed nothing. The migrations and the seed wrote to collections named in snake case, while the application's models quietly read the default pluralised names.</p><h2>Make names explicit</h2><p>Pin the collection name on every model instead of relying on a default. Then add one test that compares each model's collection with the names the seed and migrations use.</p><h2>The takeaway</h2><p>Defaults are fine until two tools disagree about them. Writing the name down once removes the guesswork.</p>",
  },
  {
    name: "Start a case study with the client's problem, not your stack",
    excerpt:
      "Visitors do not ask which tools you know. They ask whether you can solve their problem.",
    pillar: "ai_automation",
    topics: ["communication", "portfolio"],
    minutes: 3,
    body: "<p>Most portfolios list technologies. A visitor with a business problem is asking something different: can this person fix mine?</p><h2>A better order</h2><p>Lead with the problem and what made it hard. Then the approach and the decisions, the solution, and finally what changed for the business. Tools come last, as supporting detail.</p><h2>Why it works</h2><p>The visitor recognises their own situation in the first paragraph, and the rest shows how you think.</p>",
  },
  {
    name: "Make automation easy to switch off",
    excerpt:
      "Automation earns trust when a person can see what it did and turn it off without a deployment.",
    pillar: "ai_automation",
    topics: ["automation", "reliability"],
    minutes: 3,
    body: "<p>Automation that cannot be paused is a liability. The first time it misbehaves, the team has no safe way to stop it.</p><h2>Three habits</h2><p>Process work in small batches so a mistake stays small. Record the outcome of every attempt so a person can review it. Cap retries so a failing item surfaces instead of looping forever.</p><h2>Trust follows</h2><p>When people can see, limit, and stop the automation, they are far more willing to rely on it.</p>",
  },
];

export const LAUNCH_PILLAR_COPY: Record<
  PillarKey,
  Readonly<{ client_outcome: string; seo_summary: string }>
> = {
  system_architect: {
    client_outcome:
      "A clear plan that lowers risk, rework, and running cost before the build starts.",
    seo_summary:
      "System architecture, data modelling, and delivery planning that reduce risk and cost.",
  },
  software_developer: {
    client_outcome:
      "A working, maintainable product that your team and your users can rely on.",
    seo_summary:
      "Web application development covering interface, API, and data, delivered in small reviewable steps.",
  },
  ai_automation: {
    client_outcome:
      "Repetitive work handled by automation you can monitor and switch off.",
    seo_summary:
      "Workflow and AI-assisted automation with monitoring, review steps, and safe fallbacks.",
  },
};
