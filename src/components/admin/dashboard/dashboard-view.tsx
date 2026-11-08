import type { TDashboardSnapshot } from "@/app/api/dashboard/dashboard.service";
import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import { TextLink } from "@/components/ui/text-link";
import { ConsoleOverview } from "@/components/templates/console-templates";
import {
  formatAge,
  formatClock,
  formatStamp,
  plural,
  statusLabel,
} from "./format";
import {
  deriveNeedsAttention,
  type AttentionItem,
  type AttentionSeverity,
} from "./needs-attention";
import { buildPipeline, type PipelineRow } from "./pipeline";
import { RefreshControl } from "./refresh-control";

export type DashboardViewProps = Readonly<{
  snapshot: TDashboardSnapshot;
  capabilities: readonly string[];
  environment: string;
  /**
   * Fields that differ between the Site draft and its published snapshot. `null` when it was not
   * measured (no `site:read`, or the Site could not be read): the status line then says less, not more.
   */
  unpublishedChanges: number | null;
}>;

const ENVIRONMENTS: Record<string, string> = {
  production: "Production",
  preview: "Preview",
  development: "Development",
};

const SEVERITY_WORD: Record<AttentionSeverity, string> = {
  high: "High",
  medium: "Medium",
};

/** A filled diamond for high, an outlined one for medium, always with the word (plan 4.3). */
function SeverityMark({ severity }: { severity: AttentionSeverity }) {
  return (
    <span className="cd-sev" data-severity={severity}>
      <span className="cd-sev__glyph" aria-hidden="true" />
      <span className="cd-sev__label">{SEVERITY_WORD[severity]}</span>
    </span>
  );
}

function SiteState({
  snapshot,
  canReview,
  unpublishedChanges,
}: {
  snapshot: TDashboardSnapshot;
  canReview: boolean;
  unpublishedChanges: number | null;
}) {
  const site = snapshot.content.site;
  if (!site.configured) return <>Site not configured</>;
  const link = canReview ? (
    <TextLink href="/admin/site/review">Review and publish</TextLink>
  ) : null;
  if (!site.published) {
    return (
      <>
        Site not published, draft r{site.draft_revision}
        {link ? <> ({link})</> : null}
      </>
    );
  }
  const changed =
    unpublishedChanges === null
      ? site.draft_revision !== site.published_revision
      : unpublishedChanges > 0;
  return (
    <>
      Site published r{site.published_revision}, draft r{site.draft_revision}
      {changed ? (
        <>
          {" "}
          (
          {unpublishedChanges === null
            ? "unpublished changes"
            : `${unpublishedChanges} unpublished ${plural(unpublishedChanges, "change")}`}
          {link ? <>: {link}</> : null})
        </>
      ) : null}
    </>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  return (
    <li className="cd-row" data-severity={item.severity}>
      <SeverityMark severity={item.severity} />
      <span className="cd-row__fact">
        <span className="t-mono cd-num">{item.count}</span> {item.fact}
      </span>
      {item.linkable ? (
        <TextLink
          href={item.href}
          variant="quiet"
          className="cd-row__link"
          aria-label={`${item.action}${item.filtered ? " (filtered)" : ""}: ${item.count} ${item.fact}`}
          data-filtered={item.filtered ? "true" : undefined}
        >
          {item.action}
          <span aria-hidden="true">{item.filtered ? "filtered →" : "→"}</span>
        </TextLink>
      ) : null}
    </li>
  );
}

function NeedsAttention({
  items,
  generatedAt,
  span,
}: {
  items: readonly AttentionItem[];
  generatedAt: string;
  span: "8" | "12";
}) {
  return (
    <section
      className="cd-panel"
      data-span={span}
      data-testid="cd-needs-attention"
      aria-labelledby="cd-attention-heading"
    >
      <header className="cd-panel__head">
        <h2 id="cd-attention-heading" className="cd-panel__title t-eyebrow">
          Needs attention{" "}
          <span className="t-mono cd-num">({items.length})</span>
        </h2>
        <span className="t-mono cd-faint">
          checked {formatClock(generatedAt)}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="cd-empty">
          Nothing needs attention. Every measured check was clear at{" "}
          <span className="t-mono">{formatClock(generatedAt)}</span>.
        </p>
      ) : (
        <ul className="cd-rows">
          {items.map((item) => (
            <AttentionRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function InboxCard({ snapshot }: { snapshot: TDashboardSnapshot }) {
  const { inbox, generated_at: now } = snapshot;
  // The latest inquiry is shown by state and age only: its topic is visitor-written text, which this
  // projection deliberately never carries (see dashboard.service).
  const latest = inbox.recent[0];
  return (
    <section
      className="cd-panel"
      data-span="4"
      data-testid="cd-inbox"
      aria-labelledby="cd-inbox-heading"
    >
      <header className="cd-panel__head">
        <h2 id="cd-inbox-heading" className="cd-panel__title t-eyebrow">
          Inbox
        </h2>
      </header>
      <p className="cd-figures">
        <span className="t-mono cd-num">{inbox.by_status.new}</span> new
        <span aria-hidden="true"> · </span>
        <span className="t-mono cd-num">{inbox.by_status.qualified}</span>{" "}
        qualified
      </p>
      <p className="cd-note">
        {latest ? (
          <>
            Latest: {statusLabel(latest.status).toLowerCase()},{" "}
            <span className="t-mono">{formatAge(latest.created_at, now)}</span>
          </>
        ) : (
          "No inquiries stored yet."
        )}
      </p>
      <TextLink href="/admin/contacts" variant="quiet" className="cd-link">
        Open inbox <span aria-hidden="true">→</span>
      </TextLink>
    </section>
  );
}

function PatternSwatch({ pattern }: { pattern: string }) {
  return (
    <span className="cd-swatch" data-pattern={pattern} aria-hidden="true" />
  );
}

function PipelineRows({
  rows,
  canOpen,
}: {
  rows: readonly PipelineRow[];
  canOpen: boolean;
}) {
  return (
    <ul className="cd-pipeline">
      {rows.map((row) => (
        <li
          key={row.key}
          className="cd-pipe"
          data-testid={`cd-pipe-${row.key}`}
        >
          <span className="cd-pipe__name">
            {canOpen ? (
              <TextLink href={row.href} variant="quiet">
                {row.label}
              </TextLink>
            ) : (
              row.label
            )}{" "}
            <span className="t-mono cd-num cd-faint">{row.total}</span>
          </span>
          <div className="cd-pipe__body">
            <div
              className="cd-bar"
              aria-hidden="true"
              data-empty={row.total === 0}
            >
              {row.segments
                .filter((segment) => segment.count > 0)
                .map((segment) => (
                  <span
                    key={segment.status}
                    className="cd-seg"
                    data-pattern={segment.pattern}
                    data-status={segment.status}
                    style={{ flexGrow: segment.count }}
                  />
                ))}
            </div>
            <ul className="cd-legend">
              {row.segments.map((segment) => (
                <li key={segment.status} data-status={segment.status}>
                  <PatternSwatch pattern={segment.pattern} />
                  <span className="t-mono cd-num">{segment.count}</span>{" "}
                  {segment.status}
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Activity({ snapshot }: { snapshot: TDashboardSnapshot }) {
  const { audit } = snapshot.system;
  const events = audit.publish_activity.slice(0, 8);
  return (
    <section
      className="cd-panel"
      data-span="7"
      data-testid="cd-activity"
      aria-labelledby="cd-activity-heading"
    >
      <header className="cd-panel__head">
        <h2 id="cd-activity-heading" className="cd-panel__title t-eyebrow">
          Recent activity
        </h2>
        <span className="t-mono cd-faint">
          {audit.events_last_24h} audit {plural(audit.events_last_24h, "event")}{" "}
          in 24 h
        </span>
      </header>
      {events.length === 0 ? (
        <p className="cd-empty">No publish activity has been recorded yet.</p>
      ) : (
        <ul className="cd-rows">
          {events.map((event, index) => (
            <li
              key={`${event.summary_code}-${event.created_at}-${index}`}
              className="cd-event"
            >
              <time
                className="t-mono cd-faint"
                dateTime={event.created_at ?? undefined}
              >
                {formatStamp(event.created_at)}
              </time>
              <span>
                {statusLabel(event.summary_code)}
                <span className="cd-faint">
                  {" "}
                  · {statusLabel(event.target_type)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <TextLink href="/admin/audit" variant="quiet" className="cd-link">
        Open audit log <span aria-hidden="true">→</span>
      </TextLink>
    </section>
  );
}

const OUTBOX_MARK: Record<
  TDashboardSnapshot["system"]["outbox"]["state"],
  { state: StatusMarkState; label: string }
> = {
  clear: { state: "success", label: "Clear" },
  work_pending: { state: "pending", label: "Work pending" },
  attention_required: { state: "error", label: "Attention required" },
};

function System({
  snapshot,
  canOpenMedia,
  span,
}: {
  snapshot: TDashboardSnapshot;
  canOpenMedia: boolean;
  span: "5" | "12";
}) {
  const { outbox } = snapshot.system;
  const { media } = snapshot;
  const outboxMark = OUTBOX_MARK[outbox.state];
  const mediaMark: { state: StatusMarkState; label: string } =
    media.operational_errors > 0
      ? { state: "error", label: "Errors" }
      : media.metadata.incomplete > 0
        ? { state: "warning", label: "Metadata incomplete" }
        : { state: "success", label: "Clear" };
  return (
    <section
      className="cd-panel"
      data-span={span}
      data-testid="cd-system"
      aria-labelledby="cd-system-heading"
    >
      <header className="cd-panel__head">
        <h2 id="cd-system-heading" className="cd-panel__title t-eyebrow">
          System
        </h2>
      </header>
      <dl className="cd-facts">
        <div className="cd-fact">
          <dt>Outbox</dt>
          <dd>
            <StatusMark state={outboxMark.state}>{outboxMark.label}</StatusMark>
            <span className="t-mono cd-figures-line">
              {outbox.by_status.pending} pending · {outbox.by_status.processing}{" "}
              processing · {outbox.by_status.dead_letter} dead letter
              {outbox.oldest_due_at
                ? ` · oldest due ${formatAge(outbox.oldest_due_at, snapshot.generated_at)}`
                : ""}
            </span>
          </dd>
        </div>
        <div className="cd-fact">
          <dt>Media</dt>
          <dd>
            <StatusMark state={mediaMark.state}>{mediaMark.label}</StatusMark>
            <span className="t-mono cd-figures-line">
              {media.total} {plural(media.total, "file")} ·{" "}
              {media.metadata.incomplete} missing metadata ·{" "}
              {media.operational_errors} lifecycle{" "}
              {plural(media.operational_errors, "error")}
            </span>
            {canOpenMedia ? (
              <TextLink href="/admin/media" variant="quiet" className="cd-link">
                Open media library <span aria-hidden="true">→</span>
              </TextLink>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function DashboardView({
  snapshot,
  capabilities,
  environment,
  unpublishedChanges,
}: DashboardViewProps) {
  const can = (capability: string) => capabilities.includes(capability);
  const attention = deriveNeedsAttention(snapshot, capabilities);
  const pipeline = buildPipeline(snapshot);

  return (
    <ConsoleOverview
      className="cd"
      header={
        <header className="cd-head">
          <h1 id="cd-title" className="cd-title">
            Dashboard
          </h1>
          <div className="cd-status">
            <p className="cd-status__text t-mono">
              {ENVIRONMENTS[environment] ?? statusLabel(environment)}
              <span aria-hidden="true"> · </span>
              <SiteState
                snapshot={snapshot}
                canReview={can("site:read")}
                unpublishedChanges={unpublishedChanges}
              />
            </p>
            <RefreshControl generatedAt={snapshot.generated_at} />
          </div>
        </header>
      }
    >
      <div className="cd-grid">
        <NeedsAttention
          items={attention}
          generatedAt={snapshot.generated_at}
          span={can("inbox:manage") ? "8" : "12"}
        />
        {can("inbox:manage") ? <InboxCard snapshot={snapshot} /> : null}
        <section
          className="cd-panel"
          data-span="12"
          data-testid="cd-pipeline"
          aria-labelledby="cd-pipeline-heading"
        >
          <header className="cd-panel__head">
            <h2 id="cd-pipeline-heading" className="cd-panel__title t-eyebrow">
              Publishing pipeline
            </h2>
          </header>
          <PipelineRows rows={pipeline} canOpen={can("content:read")} />
        </section>
        {can("audit:read") ? <Activity snapshot={snapshot} /> : null}
        <System
          snapshot={snapshot}
          canOpenMedia={can("media:manage")}
          span={can("audit:read") ? "5" : "12"}
        />
      </div>
    </ConsoleOverview>
  );
}
