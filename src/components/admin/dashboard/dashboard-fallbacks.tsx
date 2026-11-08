import { ConsoleOverview } from "@/components/templates/console-templates";
import { TextLink } from "@/components/ui/text-link";

const WORKSPACES = [
  {
    title: "Projects",
    description: "Maintain case studies, evidence, visibility, and outcomes.",
    href: "/admin/projects",
    capability: "content:read",
  },
  {
    title: "Case studies",
    description: "Tell the full story of a problem solved, step by step.",
    href: "/admin/case-studies",
    capability: "content:read",
  },
  {
    title: "Articles",
    description: "Draft and publish long-form engineering knowledge.",
    href: "/admin/articles",
    capability: "content:read",
  },
  {
    title: "Videos",
    description: "Add landscape videos and reels from YouTube or an upload.",
    href: "/admin/videos",
    capability: "content:read",
  },
  {
    title: "Profile settings",
    description: "Manage the identity attached to this admin account.",
    href: "/admin/settings",
    capability: "admin:access",
  },
] as const;

/** What a role without `dashboard:read` sees instead of the measured dashboard. */
export function WorkspaceDirectory({
  capabilities,
}: {
  capabilities: readonly string[];
}) {
  const visible = WORKSPACES.filter((item) =>
    capabilities.includes(item.capability)
  );
  return (
    <ConsoleOverview
      className="cd"
      header={
        <header className="cd-head">
          <h1 id="cd-title" className="cd-title">
            Portfolio administration
          </h1>
          <p className="cd-note">
            Your role can access the working areas below. Operational dashboard
            data is restricted to dashboard readers.
          </p>
        </header>
      }
    >
      <section className="cd-panel" aria-labelledby="cd-workspaces-heading">
        <h2 id="cd-workspaces-heading" className="sr-only">
          Available workspaces
        </h2>
        <ul className="cd-rows">
          {visible.map((item) => (
            <li key={item.href} className="cd-workspace">
              <TextLink href={item.href} variant="quiet">
                {item.title}
              </TextLink>
              <span className="cd-note">{item.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </ConsoleOverview>
  );
}

/** The snapshot could not be read: say so, and keep the rest of the console one click away. */
export function DashboardUnavailable() {
  return (
    <ConsoleOverview
      className="cd"
      header={
        <header className="cd-head">
          <h1 id="cd-title" className="cd-title">
            Dashboard data is unavailable
          </h1>
        </header>
      }
    >
      <section className="cd-panel" role="alert">
        <p className="cd-note">
          The secure workspace is still available. Retry this measured view or
          continue directly to a content workspace.
        </p>
        <p className="cd-actions">
          <TextLink href="/admin">Retry dashboard</TextLink>
          <TextLink href="/admin/projects">Open projects</TextLink>
        </p>
      </section>
    </ConsoleOverview>
  );
}
