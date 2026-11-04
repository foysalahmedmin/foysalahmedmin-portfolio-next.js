import type { CaseStudyArchitecture } from "../content/case-study-contract.ts";
import type { PillarKey } from "../content/pillars.ts";
import { normalizeSlug } from "../content/slug.ts";

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

export type LaunchCaseStudyKey =
  | "publishing"
  | "migrations"
  | "contact-intake"
  | "upkeep";

export type LaunchCaseStudy = Readonly<{
  key: LaunchCaseStudyKey;
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
  constraints: readonly string[];
  architecture: CaseStudyArchitecture;
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
    key: "publishing",
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
    constraints: [
      "One owner acting as the only author",
      "No budget for a separate CMS subscription",
      "Public pages must stay fast and indexable",
      "Nothing may reach visitors before it has been reviewed",
    ],
    // Every node and edge below was checked against this repository:
    //  admin        src/app/admin/(protected)/{site,pages/[routeKey]}/page.tsx, src/components/admin/{site,page}-admin-editor.tsx
    //  capabilities src/lib/auth/capabilities.ts (site:edit, site:publish), enforced in src/app/api/pages/page.controller.ts
    //  draft-api    src/app/api/pages/page.service.ts saveDraft and src/app/api/site/site.service.ts updateSiteDraft (expected_revision)
    //  publish      src/app/api/pages/page.service.ts publishPage: validatePageGraph (page.graph.ts), publishConditional, cache intent and audit event in one withTransaction
    //  content-db   collections `pages` (page.model.ts) and `sites` (site.model.ts)
    //  audit-log    src/app/api/audit-events/audit-event.service.ts appendAuditEvent
    //  invalidation collection `page_cache_invalidations` (page-cache-invalidation.model.ts), delivered after commit by deliverCacheInvalidation
    //  public-cache readPublishedPage: unstable_cache tagged portfolio:v1:pages (page.service.ts, page.cache.ts)
    //  public-site  src/app/(common)/(home)/page.tsx and the other public routes via src/lib/pages/published-page-resolver.ts
    architecture: {
      alt: "Editors save drafts in the admin workspace. A publish transaction checks the whole content graph, then stores the published snapshot, an audit event and a cache refresh request together. Visitors read the published pages through a tagged cache.",
      layers: ["Editing", "Publishing", "Storage", "Delivery"],
      nodes: [
        {
          key: "admin",
          label: "Admin workspace",
          layer: "Editing",
          kind: "client",
          note: "Draft editors for the Site profile and each fixed Page.",
        },
        {
          key: "capabilities",
          label: "Capability table",
          layer: "Publishing",
          kind: "service",
          note: "One table of permissions; the server checks site:edit and site:publish.",
        },
        {
          key: "draft-api",
          label: "Draft API",
          layer: "Publishing",
          kind: "service",
          note: "Saves a draft only when the expected revision still matches.",
        },
        {
          key: "publish",
          label: "Publish transaction",
          layer: "Publishing",
          kind: "service",
          note: "Checks every record the page shows, then writes everything together or nothing.",
        },
        {
          key: "content-db",
          label: "Pages and Site records",
          layer: "Storage",
          kind: "data",
          note: "Each record keeps an editable draft and a published snapshot.",
        },
        {
          key: "audit-log",
          label: "Audit log",
          layer: "Storage",
          kind: "data",
          note: "Append-only record of every publish.",
        },
        {
          key: "invalidation",
          label: "Cache refresh request",
          layer: "Storage",
          kind: "queue",
          note: "Stored with the publish and retried if the refresh fails.",
        },
        {
          key: "public-cache",
          label: "Tagged public cache",
          layer: "Delivery",
          kind: "data",
          note: "Published pages are cached and refreshed by tag when content is published.",
        },
        {
          key: "public-site",
          label: "Public pages",
          layer: "Delivery",
          kind: "output",
          note: "Visitors only see the published snapshot.",
        },
      ],
      edges: [
        { from: "admin", to: "draft-api", label: "save draft" },
        { from: "admin", to: "publish", label: "publish" },
        { from: "capabilities", to: "draft-api", label: "site:edit" },
        { from: "capabilities", to: "publish", label: "site:publish" },
        { from: "draft-api", to: "content-db", label: "conditional update" },
        { from: "publish", to: "content-db", label: "published snapshot" },
        { from: "publish", to: "audit-log", label: "audit event" },
        { from: "publish", to: "invalidation", label: "refresh request" },
        {
          from: "invalidation",
          to: "public-cache",
          label: "revalidate by tag",
        },
        { from: "content-db", to: "public-cache", label: "read on a miss" },
        { from: "public-cache", to: "public-site", label: "cached read" },
      ],
      steps: [
        {
          title: "Draft and review",
          focus: ["admin", "capabilities", "draft-api", "content-db"],
        },
        {
          title: "Publish as one transaction",
          focus: ["publish", "content-db", "audit-log", "invalidation"],
        },
        {
          title: "Refresh what visitors see",
          focus: ["invalidation", "public-cache", "public-site"],
        },
      ],
    },
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
    key: "migrations",
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
      "Offer a dry run that reports what would change before anything is applied",
      "Block destructive steps unless a fresh backup reference is supplied",
      "Record the checksum of every applied migration and refuse to continue if one has drifted",
      "Make every step idempotent so a repeat run changes nothing",
    ],
    constraints: [
      "A single production database",
      "No dedicated operations team: one operator ships every change",
      "A destructive step must have a verified way back before it can start",
    ],
    // Every node and edge below was checked against this repository:
    //  operator/cli scripts/migrate.ts via package.json db:migrate:dry-run and db:migrate (exactly one mode, an explicit database name)
    //  registry     src/lib/db/migrations/registry.ts (validateMigrationRegistry: unique ids, strict order)
    //  runner       src/lib/db/migrations/runner.ts MigrationRunner.run (dry-run or apply; applied steps are reported as skipped)
    //  checksum     runner.ts assertStoredMigrationIntegrity and checksum.ts (MIGRATION_CHECKSUM_DRIFT)
    //  backup       runner.ts assertBackupGate and backup.ts parseBackupConfirmation (reference plus a timestamp no older than 24 hours)
    //  lease        src/lib/db/migrations/lease.ts MongoMigrationLease, acquired in runApply only
    //  records      collection `schema_migrations` (runner.ts migrationCollection)
    //  report       JSON printed by scripts/migrate.ts: per-step status dry-run, skipped or applied
    architecture: {
      alt: "An operator runs the migration command in dry-run or apply mode. The runner reads the ordered registry, verifies recorded checksums, requires a fresh backup reference for destructive steps and an exclusive lease when applying, runs each step against MongoDB, records its status and prints a report.",
      layers: ["Operator", "Runner", "Safety gates", "Database"],
      nodes: [
        {
          key: "operator",
          label: "Operator",
          layer: "Operator",
          kind: "client",
          note: "Runs the dry-run command first, then the apply command.",
        },
        {
          key: "cli",
          label: "Migration command",
          layer: "Operator",
          kind: "service",
          note: "Requires exactly one mode and an explicit database name.",
        },
        {
          key: "registry",
          label: "Migration registry",
          layer: "Runner",
          kind: "data",
          note: "Ordered definitions; a duplicate or out-of-order id stops the run.",
        },
        {
          key: "runner",
          label: "Migration runner",
          layer: "Runner",
          kind: "automation",
          note: "Dry run reports what is pending; apply runs it in order and skips what is applied.",
        },
        {
          key: "checksum",
          label: "Checksum check",
          layer: "Safety gates",
          kind: "service",
          note: "A recorded checksum that differs from the source stops the run.",
        },
        {
          key: "backup",
          label: "Backup gate",
          layer: "Safety gates",
          kind: "service",
          note: "A destructive step needs a backup reference verified within 24 hours.",
        },
        {
          key: "lease",
          label: "Exclusive lease",
          layer: "Safety gates",
          kind: "service",
          note: "Held while applying, so two runs cannot overlap.",
        },
        {
          key: "mongo",
          label: "Application collections",
          layer: "Database",
          kind: "data",
          note: "Where each step makes its change, indexes included.",
        },
        {
          key: "records",
          label: "schema_migrations records",
          layer: "Database",
          kind: "data",
          note: "Status and checksum of every migration.",
        },
        {
          key: "report",
          label: "Run report",
          layer: "Operator",
          kind: "output",
          note: "JSON listing each step as dry-run, skipped or applied.",
        },
      ],
      edges: [
        { from: "operator", to: "cli", label: "runs command" },
        { from: "cli", to: "runner", label: "mode and database" },
        { from: "registry", to: "runner", label: "ordered definitions" },
        { from: "runner", to: "checksum", label: "verify records" },
        { from: "checksum", to: "records", label: "read checksums" },
        { from: "runner", to: "backup", label: "destructive steps" },
        { from: "runner", to: "lease", label: "acquire on apply" },
        { from: "runner", to: "mongo", label: "run each step" },
        { from: "runner", to: "records", label: "record status" },
        { from: "runner", to: "report", label: "per-step status" },
      ],
      steps: [
        {
          title: "Preview with a dry run",
          focus: ["operator", "cli", "runner", "report"],
        },
        {
          title: "Gate the risky parts",
          focus: ["checksum", "backup", "lease"],
        },
        {
          title: "Apply in order and record it",
          focus: ["registry", "runner", "mongo", "records"],
        },
      ],
    },
    solution:
      "A command-line runner that applies the registry in order, reports the state of every index per collection, and verifies the end state before it marks a migration as applied. Indexes are compared with what the database reports, not what was requested.",
    results:
      "Schema changes ship as small, reviewed steps. A repeat run reports 'skipped' instead of touching data, and a destructive change cannot start without a verified way back.",
    outcomes: [
      {
        label: "Preview of a change before it is applied",
        value: "Dry run",
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
    key: "contact-intake",
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
    constraints: [
      "No third-party form service",
      "Personal data must expire after a set period",
      "A real enquiry must never be lost, even when email delivery fails",
      "Abuse has to be slowed down without visible puzzles",
    ],
    // Every node and edge below was checked against this repository:
    //  form       src/components/(common)/contact-page/contact-content-section/index.tsx (idempotency-key and x-contact-session headers, form_started_at, honeypot field company_website)
    //  route      src/app/api/contacts/route.ts POST
    //  trust      contact-security.ts assertTrustedContactRequest (origin) and readContactJsonBody (JSON only, bounded size)
    //  bot-check  contact-security.ts assertContactTimingAndHoneypot (minimum fill time, honeypot)
    //  limiter    contact-security.ts enforceContactRateLimit (per IP and per session, keyed hashes)
    //  upstash    contact-security.ts consumeRateLimitBucket (Upstash REST when configured, otherwise in-process counters)
    //  intake     src/app/api/contacts/contact-intake.service.ts submitContact: Contact, ContactSubmissionKey, AuditEvent and OutboxEvent in one session.withTransaction
    //  contacts   contact.model.ts and contact-submission-key.model.ts
    //  outbox     src/app/api/outbox-events/outbox-event.model.ts (collection outbox_events)
    //  worker     src/app/api/contacts/contact-outbox.service.ts processContactOutbox via src/app/api/internal/contact-outbox/route.ts (bearer secret)
    //  mail       src/utils/send-email.ts (nodemailer)
    //  retention  src/app/api/contacts/contact-retention.service.ts anonymizeExpiredContacts via src/app/api/internal/contact-retention/route.ts
    architecture: {
      alt: "The contact form posts to an intake route that checks origin, size, timing, honeypot and rate limits. A valid message is stored with a receipt and an outbox event in one transaction. An outbox worker emails the owner and retries; a retention worker anonymises old contacts.",
      layers: ["Visitor", "Intake checks", "Storage", "Delivery"],
      nodes: [
        {
          key: "form",
          label: "Contact form",
          layer: "Visitor",
          kind: "client",
          note: "Sends a unique submission key, the time the form was opened and a hidden honeypot field.",
        },
        {
          key: "route",
          label: "Intake route",
          layer: "Intake checks",
          kind: "service",
          note: "POST route that runs each check, then stores the message.",
        },
        {
          key: "trust-check",
          label: "Origin and size checks",
          layer: "Intake checks",
          kind: "service",
          note: "Rejects untrusted origins, non-JSON bodies and oversized requests.",
        },
        {
          key: "bot-check",
          label: "Timing and honeypot",
          layer: "Intake checks",
          kind: "service",
          note: "Rejects forms filled too fast, too slowly, or with the hidden field set.",
        },
        {
          key: "limiter",
          label: "Rate limits",
          layer: "Intake checks",
          kind: "service",
          note: "Counts per IP address and per session, using keyed hashes.",
        },
        {
          key: "upstash",
          label: "Upstash Redis (optional)",
          layer: "Intake checks",
          kind: "external",
          note: "Shared counters when configured; otherwise each instance counts for itself.",
        },
        {
          key: "intake",
          label: "Intake transaction",
          layer: "Storage",
          kind: "service",
          note: "Stores the message, receipt, audit event and outbox event together.",
        },
        {
          key: "contacts",
          label: "Contacts and receipts",
          layer: "Storage",
          kind: "data",
          note: "A repeated submission key returns the same receipt instead of a second message.",
        },
        {
          key: "outbox",
          label: "Outbox",
          layer: "Delivery",
          kind: "queue",
          note: "A pending notification per message, kept until it is delivered.",
        },
        {
          key: "worker",
          label: "Outbox worker",
          layer: "Delivery",
          kind: "automation",
          note: "Claims a small batch, retries with growing delays and stops after the attempt limit.",
        },
        {
          key: "mail",
          label: "Email provider",
          layer: "Delivery",
          kind: "external",
          note: "Sends the notification to the owner.",
        },
        {
          key: "retention",
          label: "Retention worker",
          layer: "Storage",
          kind: "automation",
          note: "Anonymises contacts once their retention period has passed.",
        },
        {
          key: "receipt",
          label: "Receipt",
          layer: "Visitor",
          kind: "output",
          note: "The visitor gets a receipt code once the message is stored.",
        },
      ],
      edges: [
        { from: "form", to: "route", label: "post with submission key" },
        { from: "route", to: "trust-check", label: "origin and size" },
        { from: "route", to: "bot-check", label: "timing and honeypot" },
        { from: "route", to: "limiter", label: "per IP and session" },
        { from: "limiter", to: "upstash", label: "shared counters" },
        { from: "route", to: "intake", label: "valid message" },
        { from: "intake", to: "contacts", label: "store with receipt" },
        { from: "intake", to: "outbox", label: "queue notification" },
        { from: "route", to: "receipt", label: "receipt code" },
        { from: "outbox", to: "worker", label: "claim batch" },
        { from: "worker", to: "mail", label: "send notification" },
        { from: "worker", to: "contacts", label: "delivery status" },
        { from: "retention", to: "contacts", label: "anonymise expired" },
      ],
      steps: [
        {
          title: "Check before storing",
          focus: [
            "form",
            "route",
            "trust-check",
            "bot-check",
            "limiter",
            "upstash",
          ],
        },
        {
          title: "Store once, never lose",
          focus: ["intake", "contacts", "outbox", "receipt"],
        },
        {
          title: "Deliver and retry",
          focus: ["outbox", "worker", "mail"],
        },
        {
          title: "Expire personal data",
          focus: ["retention", "contacts"],
        },
      ],
    },
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
    key: "upkeep",
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
    constraints: [
      "Jobs must be safe to run twice",
      "Only a trusted scheduler may trigger them",
      "Every automated action must leave a trail a person can review",
    ],
    // Every node and edge below was checked against this repository:
    //  scheduler        not configured here: vercel.json has no cron entries; docs/architecture/0007 names a protected cron route as the intended trigger
    //  auth-check       contact-outbox.service.ts isAuthorizedContactWorkerRequest (bearer secret, timing-safe compare) for both internal routes;
    //                   src/app/api/files/admin/reconcile/route.ts hasReconcileSecret, or a super-admin session
    //  outbox-worker    src/app/api/internal/contact-outbox/route.ts, processContactOutbox (batch size 1 to 50, default 10; attempt limit default 5, then dead_letter)
    //  retention-worker src/app/api/internal/contact-retention/route.ts, anonymizeExpiredContacts (MAX_RETENTION_BATCH = 100)
    //  reconciler       src/app/api/files/admin/reconcile/route.ts, file.service.ts reconcileFailedManagedMedia (limit at most 100)
    //  outbox/contacts  outbox-event.model.ts, contact.model.ts; files-db is the files collection read by FileRepository
    //  mail/storage     src/utils/send-email.ts; managed storage providers behind listManagedMediaObjects and removePhysicalFile
    //  dead-letter      OutboxEvent status dead_letter (contact-outbox.service.ts getContactFailureState)
    //  run-result       the JSON counts each route returns (ContactOutboxRunResult, ContactRetentionResult, reconcile result)
    architecture: {
      alt: "A scheduler calls three authenticated worker routes: an outbox worker that emails in small batches and dead-letters items past the attempt limit, a retention worker that anonymises expired contacts, and a media reconciler. Each route returns counts of what it did.",
      layers: ["Trigger", "Workers", "Data and storage", "Outcome"],
      nodes: [
        {
          key: "scheduler",
          label: "Scheduler",
          layer: "Trigger",
          kind: "external",
          note: "Calls each route on a timer. No schedule is configured in this repository.",
        },
        {
          key: "auth-check",
          label: "Bearer secret check",
          layer: "Trigger",
          kind: "service",
          note: "Routes reject calls without the shared secret; the media route also accepts a super-admin session.",
        },
        {
          key: "outbox-worker",
          label: "Email outbox worker",
          layer: "Workers",
          kind: "automation",
          note: "Sends queued notifications in a bounded batch.",
        },
        {
          key: "retention-worker",
          label: "Retention worker",
          layer: "Workers",
          kind: "automation",
          note: "Anonymises contacts past their retention period, in bounded batches.",
        },
        {
          key: "reconciler",
          label: "Media reconciler",
          layer: "Workers",
          kind: "automation",
          note: "Cleans up failed uploads and stored files that have no record.",
        },
        {
          key: "outbox",
          label: "Outbox events",
          layer: "Data and storage",
          kind: "queue",
          note: "Each event records its attempts and its last failure.",
        },
        {
          key: "contacts",
          label: "Contacts",
          layer: "Data and storage",
          kind: "data",
          note: "Personal data is replaced once the retention period ends.",
        },
        {
          key: "files-db",
          label: "File records",
          layer: "Data and storage",
          kind: "data",
          note: "Tells the reconciler which stored files are expected.",
        },
        {
          key: "storage-providers",
          label: "Storage providers",
          layer: "Data and storage",
          kind: "external",
          note: "Where uploaded media lives.",
        },
        {
          key: "mail",
          label: "Email provider",
          layer: "Data and storage",
          kind: "external",
          note: "Delivers the notification.",
        },
        {
          key: "dead-letter",
          label: "Items needing attention",
          layer: "Outcome",
          kind: "output",
          note: "After the attempt limit an item stops retrying and waits for a person.",
        },
        {
          key: "run-result",
          label: "Run result",
          layer: "Outcome",
          kind: "output",
          note: "Every route returns counts of what it claimed, changed or could not do.",
        },
      ],
      edges: [
        { from: "scheduler", to: "auth-check", label: "bearer secret" },
        { from: "auth-check", to: "outbox-worker", label: "authorised call" },
        {
          from: "auth-check",
          to: "retention-worker",
          label: "authorised call",
        },
        { from: "auth-check", to: "reconciler", label: "authorised call" },
        { from: "outbox-worker", to: "outbox", label: "claim a batch" },
        { from: "outbox-worker", to: "mail", label: "send" },
        {
          from: "outbox-worker",
          to: "dead-letter",
          label: "after attempt limit",
        },
        {
          from: "retention-worker",
          to: "contacts",
          label: "anonymise expired",
        },
        { from: "reconciler", to: "files-db", label: "find failed uploads" },
        {
          from: "reconciler",
          to: "storage-providers",
          label: "remove untracked files",
        },
        { from: "outbox-worker", to: "run-result", label: "counts" },
        { from: "retention-worker", to: "run-result", label: "counts" },
        { from: "reconciler", to: "run-result", label: "counts" },
      ],
      steps: [
        {
          title: "Only the scheduler may call",
          focus: ["scheduler", "auth-check"],
        },
        {
          title: "Small batches and capped retries",
          focus: ["outbox-worker", "outbox", "mail", "dead-letter"],
        },
        {
          title: "Expire and tidy",
          focus: [
            "retention-worker",
            "contacts",
            "reconciler",
            "files-db",
            "storage-providers",
          ],
        },
        {
          title: "Leave a trail",
          focus: ["run-result", "dead-letter"],
        },
      ],
    },
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

/** Public slug of a launch case study: the same normalisation the Case study service applies to its name. */
export const launchCaseStudySlug = (key: LaunchCaseStudyKey): string => {
  const study = LAUNCH_CASE_STUDIES.find((entry) => entry.key === key);
  if (!study) throw new Error(`Unknown launch case study: ${key}`);
  return normalizeSlug(study.name);
};
