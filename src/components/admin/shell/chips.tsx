import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import Link from "next/link";

export type SiteState = Readonly<{
  configured: boolean;
  published: boolean;
  draftRevision?: number;
  publishedRevision?: number;
}>;

export type EnvironmentName = "Production" | "Preview" | "Development";

export const environmentLabel = (environment: string): EnvironmentName => {
  const normalized = environment.trim().toLowerCase();
  if (normalized === "production") return "Production";
  if (normalized === "preview") return "Preview";
  return "Development";
};

// Shape carries the environment: filled square = production, half = preview, outline = development.
const environmentMark: Record<EnvironmentName, StatusMarkState> = {
  Production: "published",
  Preview: "pending",
  Development: "draft",
};

export function EnvironmentChip({ environment }: { environment: string }) {
  const label = environmentLabel(environment);
  return (
    <span
      className="cs-chip cs-chip--env"
      data-env={label.toLowerCase()}
      data-testid="environment-chip"
    >
      <span className="sr-only">Environment: </span>
      <StatusMark state={environmentMark[label]}>{label}</StatusMark>
    </span>
  );
}

type PublishChipView = Readonly<{
  variant: "ahead" | "level" | "none";
  text: string;
}> | null;

/** What the chip says, or null when it must not render (no Site, or no `site:read`). */
export const publishChipView = (
  siteState: SiteState | undefined,
  canReadSite: boolean
): PublishChipView => {
  if (!siteState?.configured || !canReadSite) return null;
  if (!siteState.published) return { variant: "none", text: "Not published" };
  const { draftRevision, publishedRevision } = siteState;
  const published = `Published r${publishedRevision}`;
  return draftRevision !== undefined &&
    publishedRevision !== undefined &&
    draftRevision > publishedRevision
    ? {
        variant: "ahead",
        text: `${published}, draft r${draftRevision}: review and publish`,
      }
    : { variant: "level", text: published };
};

const publishMark: Record<"ahead" | "level" | "none", StatusMarkState> = {
  ahead: "pending",
  level: "published",
  none: "draft",
};

export function PublishChip({
  siteState,
  canReadSite,
}: {
  siteState: SiteState | undefined;
  canReadSite: boolean;
}) {
  const view = publishChipView(siteState, canReadSite);
  if (!view) return null;
  const mark = (
    <StatusMark state={publishMark[view.variant]}>{view.text}</StatusMark>
  );
  return view.variant === "ahead" ? (
    <Link
      href="/admin/site"
      className="cs-chip cs-chip--publish"
      data-publish="ahead"
      data-testid="publish-chip"
    >
      {mark}
    </Link>
  ) : (
    <span
      className="cs-chip cs-chip--publish"
      data-publish={view.variant}
      data-testid="publish-chip"
    >
      <span className="sr-only">Site: </span>
      {mark}
    </span>
  );
}
