import type { Capability } from "@/lib/auth/capabilities";
import {
  BookOpenCheck,
  BookOpenText,
  BriefcaseBusiness,
  Clapperboard,
  Component,
  FileStack,
  Globe2,
  LayoutDashboard,
  Link2,
  Mail,
  MessageSquareQuote,
  ScrollText,
  Settings,
  Tags,
  Users,
} from "lucide-react";

export type NavLink = Readonly<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  capability: Capability;
}>;

export type NavGroup = Readonly<{ label: string; links: readonly NavLink[] }>;

export const adminNavGroups: readonly NavGroup[] = [
  {
    label: "Overview",
    links: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        capability: "admin:access",
      },
    ],
  },
  {
    label: "Experience",
    links: [
      {
        name: "Site settings",
        href: "/admin/site",
        icon: Globe2,
        capability: "site:read",
      },
      {
        name: "Pages",
        href: "/admin/pages",
        icon: FileStack,
        capability: "site:read",
      },
    ],
  },
  {
    label: "Content",
    links: [
      {
        name: "Projects",
        href: "/admin/projects",
        icon: BriefcaseBusiness,
        capability: "content:read",
      },
      {
        name: "Case studies",
        href: "/admin/case-studies",
        icon: BookOpenCheck,
        capability: "content:read",
      },
      {
        name: "Articles",
        href: "/admin/articles",
        icon: BookOpenText,
        capability: "content:read",
      },
      {
        name: "Videos",
        href: "/admin/videos",
        icon: Clapperboard,
        capability: "content:read",
      },
      {
        name: "Project resources",
        href: "/admin/project-resources",
        icon: Link2,
        capability: "content:read",
      },
      {
        name: "Taxonomy",
        href: "/admin/taxonomy",
        icon: Tags,
        capability: "content:read",
      },
    ],
  },
  {
    label: "Inbox",
    links: [
      {
        name: "Contact inbox",
        href: "/admin/contacts",
        icon: Mail,
        capability: "inbox:manage",
      },
      {
        name: "Review moderation",
        href: "/admin/reviews",
        icon: MessageSquareQuote,
        capability: "inbox:manage",
      },
    ],
  },
  {
    label: "System",
    links: [
      {
        name: "Users",
        href: "/admin/users",
        icon: Users,
        capability: "users:manage",
      },
      {
        name: "Audit log",
        href: "/admin/audit",
        icon: ScrollText,
        capability: "audit:read",
      },
      {
        name: "Profile settings",
        href: "/admin/settings",
        icon: Settings,
        capability: "admin:access",
      },
      {
        name: "Design system",
        href: "/admin/design-system",
        icon: Component,
        capability: "site:read",
      },
    ],
  },
];

/** Every link the user's capabilities allow, grouped; empty groups are dropped. */
export const navigationFor = (
  capabilities: readonly Capability[]
): readonly NavGroup[] =>
  adminNavGroups.flatMap((group) => {
    const links = group.links.filter((link) =>
      capabilities.includes(link.capability)
    );
    return links.length ? [{ ...group, links }] : [];
  });

export const isActivePath = (pathname: string, href: string) =>
  href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

/** The hrefs that are real routes, so the breadcrumb links only segments that exist. */
export const navHrefs: ReadonlySet<string> = new Set(
  adminNavGroups.flatMap((group) => group.links.map((link) => link.href))
);
