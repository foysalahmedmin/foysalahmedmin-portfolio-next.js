import type { TSiteAdminDto } from "@/app/api/site/site.type";
import { formatStamp, plural } from "@/components/admin/dashboard/format";
import { ConsoleOverview } from "@/components/templates/console-templates";
import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import { TextLink } from "@/components/ui/text-link";
import {
  diffSiteSnapshots,
  groupChanges,
  type SiteChange,
  type SiteChangeKind,
} from "./diff";
import { PublishAction } from "./publish-action";

const KIND: Record<SiteChangeKind, { state: StatusMarkState; label: string }> =
  {
    added: { state: "published", label: "Added" },
    removed: { state: "archived", label: "Removed" },
    changed: { state: "pending", label: "Changed" },
  };

function Value({ text }: { text: string | null }) {
  return text === null ? (
    <span className="cd-faint">Not set</span>
  ) : (
    <span className="cd-value">{text}</span>
  );
}

function ChangeRow({ change }: { change: SiteChange }) {
  const kind = KIND[change.kind];
  return (
    <tr data-kind={change.kind}>
      <th scope="row" data-label="Field">
        {change.label}
      </th>
      <td data-label="Was">
        <Value text={change.was} />
      </td>
      <td data-label="Now">
        <Value text={change.now} />
      </td>
      <td data-label="Change">
        <StatusMark state={kind.state}>{kind.label}</StatusMark>
      </td>
    </tr>
  );
}

export type SiteReviewProps = Readonly<{
  /** `null` when no Site singleton exists yet. */
  site: TSiteAdminDto | null;
  canPublish: boolean;
}>;

export function SiteReview({ site, canPublish }: SiteReviewProps) {
  const changes = site ? diffSiteSnapshots(site.published, site.draft) : [];
  const groups = groupChanges(changes);
  const published = site?.published ?? null;

  return (
    <ConsoleOverview
      className="cd cd-review"
      header={
        <header className="cd-head">
          <h1 id="cd-review-title" className="cd-title">
            Review and publish
          </h1>
          <p className="cd-status__text t-mono" data-testid="cd-review-status">
            {site ? (
              <>
                Draft r{site.revision}
                <span aria-hidden="true"> · </span>
                {published ? (
                  <>
                    Published r{published.revision},{" "}
                    {formatStamp(published.published_at)}
                    <span aria-hidden="true"> · </span>
                    {changes.length} {plural(changes.length, "change")}
                  </>
                ) : (
                  "Not published yet"
                )}
              </>
            ) : (
              "Site not configured"
            )}
          </p>
        </header>
      }
    >
      {!site ? (
        <section className="cd-panel" aria-labelledby="cd-review-state">
          <h2 id="cd-review-state" className="cd-panel__title t-eyebrow">
            Nothing to review
          </h2>
          <p className="cd-note">
            No Site exists yet, so there is no draft to publish.{" "}
            <TextLink href="/admin/site">Open Site settings</TextLink>
          </p>
        </section>
      ) : (
        <>
          <section className="cd-panel" aria-labelledby="cd-review-state">
            <h2 id="cd-review-state" className="cd-panel__title t-eyebrow">
              {published ? "Draft against published" : "Not published yet"}
            </h2>
            <p className="cd-note" data-testid="cd-review-summary">
              {!published
                ? "There is no published snapshot to compare with, so no change is listed. Publishing makes the current draft the first public Site."
                : changes.length === 0
                  ? "The draft has no field differences from the published snapshot."
                  : `${changes.length} ${plural(changes.length, "field")} differ between draft r${site.revision} and published r${published.revision}.`}{" "}
              <TextLink href="/admin/site">Edit in Site settings</TextLink>
            </p>
            {canPublish ? (
              <PublishAction
                expectedRevision={site.revision}
                publishedRevision={published?.revision ?? null}
                changeCount={changes.length}
              />
            ) : (
              <p className="cd-note">
                Your role can review the draft but not publish it.
              </p>
            )}
          </section>
          {groups.map((group) => (
            <section
              key={group.section}
              className="cd-panel"
              data-testid={`cd-review-${group.section}`}
              aria-labelledby={`cd-review-${group.section}-heading`}
            >
              <h2
                id={`cd-review-${group.section}-heading`}
                className="cd-panel__title t-eyebrow"
              >
                {group.label}{" "}
                <span className="t-mono cd-num">({group.changes.length})</span>
              </h2>
              <table className="cd-diff">
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Was</th>
                    <th scope="col">Now</th>
                    <th scope="col">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {group.changes.map((change) => (
                    <ChangeRow
                      key={`${change.path}-${change.kind}-${change.was}-${change.now}`}
                      change={change}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}
    </ConsoleOverview>
  );
}
