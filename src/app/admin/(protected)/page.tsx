import { getDashboardSnapshot } from "@/app/api/dashboard/dashboard.service";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { requireAdminSession } from "@/lib/auth/admin-session";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  ImageIcon,
  Inbox,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

type DashboardSnapshot = Awaited<ReturnType<typeof getDashboardSnapshot>>;

const formatDateTime = (value: string | null): string => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
};

const statusLabel = (value: string): string =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const workspaceItems = [
  {
    title: "Projects",
    description: "Maintain case studies, evidence, visibility, and outcomes.",
    href: "/admin/projects",
    capability: "content:read" as const,
    icon: BriefcaseBusiness,
  },
  {
    title: "Articles",
    description: "Draft and publish long-form engineering knowledge.",
    href: "/admin/articles",
    capability: "content:read" as const,
    icon: FileText,
  },
  {
    title: "Profile settings",
    description: "Manage the identity attached to this admin account.",
    href: "/admin/settings",
    capability: "admin:access" as const,
    icon: Settings,
  },
] as const;

const MetricCard = ({
  eyebrow,
  value,
  detail,
  href,
  icon: Icon,
}: {
  eyebrow: string;
  value: number;
  detail: string;
  href?: string;
  icon: typeof FileText;
}) => {
  const content = (
    <>
      <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="mt-5 block text-3xl font-bold tracking-tight tabular-nums">
        {value.toLocaleString("en")}
      </span>
      <span className="mt-1 block text-sm font-semibold">{eyebrow}</span>
      <span className="text-muted-foreground mt-2 block text-sm leading-6">
        {detail}
      </span>
    </>
  );

  if (!href) {
    return (
      <article className="border-border bg-card rounded-3xl border p-6 shadow-sm">
        {content}
      </article>
    );
  }

  return (
    <Link
      href={href}
      className="border-border bg-card focus-visible:ring-primary group rounded-3xl border p-6 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transform-none motion-reduce:transition-none"
    >
      {content}
      <span className="text-primary mt-4 flex items-center gap-2 text-sm font-semibold">
        Open workspace
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
};

const Dashboard = ({ snapshot }: { snapshot: DashboardSnapshot }) => {
  const { content, inbox, media, system } = snapshot;
  const warningCount =
    content.health.incomplete +
    content.health.stale_drafts +
    content.health.missing_media +
    content.health.broken_links +
    media.operational_errors +
    media.metadata.incomplete +
    inbox.needs_attention +
    system.outbox.by_status.dead_letter;

  const healthRows = [
    {
      label: "Incomplete content records",
      value: content.health.incomplete,
      detail: "Missing required editorial or proof fields",
    },
    {
      label: "Stale drafts",
      value: content.health.stale_drafts,
      detail: "Draft or pending records untouched for 30 days",
    },
    {
      label: "Missing editorial media",
      value: content.health.missing_media,
      detail: "Published records without a thumbnail",
    },
    {
      label: "Broken public link contracts",
      value: content.health.broken_links,
      detail: "Public visibility selected without a usable URL",
    },
    {
      label: "Media lifecycle errors",
      value: media.operational_errors,
      detail: "Provider-neutral upload or deletion failures",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <section
        className="border-border bg-card relative overflow-hidden rounded-[2rem] border p-6 shadow-sm sm:p-8"
        aria-labelledby="dashboard-overview-heading"
      >
        <div className="bg-primary/10 pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-primary text-sm font-bold tracking-[0.2em] uppercase">
              Measured workspace
            </p>
            <h1
              id="dashboard-overview-heading"
              className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Portfolio operations at a glance
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              Live publishing, inquiry, media, and system health from the
              application database. No placeholder statistics are shown.
            </p>
          </div>
          <div
            className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              warningCount > 0
                ? "border-warning/30 bg-warning/10 text-warning-foreground"
                : "border-success/30 bg-success/10 text-success-foreground"
            }`}
          >
            {warningCount > 0 ? (
              <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            )}
            {warningCount > 0
              ? `${warningCount} measured item${warningCount === 1 ? "" : "s"} need attention`
              : "All measured checks are clear"}
          </div>
        </div>
      </section>

      <section aria-labelledby="content-metrics-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm font-semibold">
              Current totals
            </p>
            <h2 id="content-metrics-heading" className="mt-1 text-xl font-bold">
              Content and operations
            </h2>
          </div>
          <p className="text-muted-foreground hidden text-xs sm:block">
            Refreshed {formatDateTime(snapshot.generated_at)}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            eyebrow="Projects"
            value={content.projects.total}
            detail={`${content.projects.by_status.published} published · ${content.projects.by_status.draft} drafts`}
            href="/admin/projects"
            icon={BriefcaseBusiness}
          />
          <MetricCard
            eyebrow="Articles"
            value={content.articles.total}
            detail={`${content.articles.by_status.published} published · ${content.articles.by_status.draft} drafts`}
            href="/admin/articles"
            icon={FileText}
          />
          <MetricCard
            eyebrow="Inquiries"
            value={inbox.total}
            detail={`${inbox.needs_attention} need attention · ${inbox.by_status.qualified} qualified`}
            icon={Inbox}
          />
          <MetricCard
            eyebrow="Managed media"
            value={media.total}
            detail={`${media.metadata.incomplete} missing metadata · ${media.operational_errors} errors`}
            icon={ImageIcon}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section
          className="border-border bg-card rounded-3xl border p-6 shadow-sm"
          aria-labelledby="pillar-coverage-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-sm font-semibold">
                Published evidence
              </p>
              <h2
                id="pillar-coverage-heading"
                className="mt-1 text-xl font-bold"
              >
                Five-pillar coverage
              </h2>
            </div>
            <Gauge className="text-primary size-6" aria-hidden="true" />
          </div>
          <div className="mt-6 space-y-5">
            {PILLAR_CONTRACT.map(({ key, label }) => {
              const coverage = content.pillar_coverage[key];
              const maxCoverage = Math.max(
                1,
                ...PILLAR_CONTRACT.map(
                  (pillar) => content.pillar_coverage[pillar.key].total
                )
              );
              const percentage = Math.round(
                (coverage.total / maxCoverage) * 100
              );
              return (
                <div key={key}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold">{label}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {coverage.projects} projects · {coverage.articles}{" "}
                      articles
                    </span>
                  </div>
                  <div
                    className="bg-muted mt-2 h-2 overflow-hidden rounded-full"
                    role="meter"
                    aria-label={`${label}: ${coverage.total} published records`}
                    aria-valuemin={0}
                    aria-valuemax={maxCoverage}
                    aria-valuenow={coverage.total}
                  >
                    <div
                      className="bg-primary h-full rounded-full transition-[width] motion-reduce:transition-none"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="border-border bg-card rounded-3xl border p-6 shadow-sm"
          aria-labelledby="health-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-sm font-semibold">
                Release readiness
              </p>
              <h2 id="health-heading" className="mt-1 text-xl font-bold">
                Content health
              </h2>
            </div>
            <ShieldCheck className="text-primary size-6" aria-hidden="true" />
          </div>
          <ul className="mt-5 divide-y" role="list">
            {healthRows.map((item) => (
              <li
                key={item.label}
                className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0"
              >
                <span>
                  <span className="block text-sm font-semibold">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs leading-5">
                    {item.detail}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                    item.value > 0
                      ? "bg-warning/15 text-warning-foreground"
                      : "bg-success/15 text-success-foreground"
                  }`}
                >
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          className="border-border bg-card rounded-3xl border p-6 shadow-sm"
          aria-labelledby="inquiry-activity-heading"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-sm font-semibold">
                Privacy-minimized
              </p>
              <h2
                id="inquiry-activity-heading"
                className="mt-1 text-xl font-bold"
              >
                Recent inquiry operations
              </h2>
            </div>
            <Inbox className="text-primary size-6" aria-hidden="true" />
          </div>
          {inbox.recent.length === 0 ? (
            <p className="text-muted-foreground mt-6 rounded-2xl border border-dashed p-5 text-sm leading-6">
              No inquiries have been stored yet. Personal content is never
              included in this dashboard projection.
            </p>
          ) : (
            <ul className="mt-5 divide-y" role="list">
              {inbox.recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      Inquiry …{item.id.slice(-6)}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {formatDateTime(item.created_at)}
                    </span>
                  </span>
                  <span className="text-right text-xs">
                    <span className="bg-primary/10 text-primary block rounded-full px-2.5 py-1 font-bold">
                      {statusLabel(item.status)}
                    </span>
                    <span className="text-muted-foreground mt-1 block">
                      {statusLabel(item.delivery_status)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="border-border bg-card rounded-3xl border p-6 shadow-sm"
          aria-labelledby="publish-activity-heading"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-sm font-semibold">
                Append-only audit trail
              </p>
              <h2
                id="publish-activity-heading"
                className="mt-1 text-xl font-bold"
              >
                Publish activity
              </h2>
            </div>
            <Clock3 className="text-primary size-6" aria-hidden="true" />
          </div>
          {system.audit.publish_activity.length === 0 ? (
            <p className="text-muted-foreground mt-6 rounded-2xl border border-dashed p-5 text-sm leading-6">
              No publish activity has been recorded yet.
            </p>
          ) : (
            <ul className="mt-5 divide-y" role="list">
              {system.audit.publish_activity.map((item, index) => (
                <li
                  key={`${item.summary_code}-${item.created_at}-${index}`}
                  className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <span className="bg-success/15 text-success-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {statusLabel(item.summary_code)}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {statusLabel(item.target_type)} ·{" "}
                      {formatDateTime(item.created_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

const WorkspaceDirectory = ({
  capabilities,
}: {
  capabilities: readonly string[];
}) => {
  const visibleItems = workspaceItems.filter((item) =>
    capabilities.includes(item.capability)
  );
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-primary text-sm font-bold tracking-[0.2em] uppercase">
          Secure workspace
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Portfolio administration
        </h1>
        <p className="text-muted-foreground mt-3 leading-7">
          Your role can access the working areas below. Operational dashboard
          data is restricted to dashboard readers.
        </p>
      </header>
      <section aria-labelledby="workspace-heading">
        <h2 id="workspace-heading" className="sr-only">
          Available workspaces
        </h2>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="border-border bg-card focus-visible:ring-primary group rounded-3xl border p-6 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-5 flex items-center justify-between gap-4">
                <span className="text-lg font-bold">{title}</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
              <span className="text-muted-foreground mt-2 block text-sm leading-6">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

const AdminDashboardPage = async () => {
  const session = await requireAdminSession("/admin");
  if (!session.capabilities.includes("dashboard:read")) {
    return <WorkspaceDirectory capabilities={session.capabilities} />;
  }

  const snapshot = await getDashboardSnapshot().catch(() => null);
  if (!snapshot) {
    return (
      <section className="border-destructive/30 bg-destructive/5 max-w-3xl rounded-3xl border p-7">
        <AlertTriangle className="text-destructive size-7" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold">
          Dashboard data is unavailable
        </h1>
        <p className="text-muted-foreground mt-3 leading-7">
          The secure workspace is still available. Retry this measured view or
          continue directly to a content workspace.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-bold"
          >
            Retry dashboard
          </Link>
          <Link
            href="/admin/projects"
            className="border-border bg-card inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-bold"
          >
            Open projects
          </Link>
        </div>
      </section>
    );
  }

  return <Dashboard snapshot={snapshot} />;
};

export default AdminDashboardPage;
