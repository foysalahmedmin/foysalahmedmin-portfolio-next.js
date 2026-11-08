import { cn } from "@/lib/utils";
import Link from "next/link";

const LAB = [
  { key: "projects", label: "Projects", href: "/projects" },
  { key: "articles", label: "Articles", href: "/articles" },
  { key: "videos", label: "Videos", href: "/videos" },
] as const;

export type LabKey = (typeof LAB)[number]["key"];

/**
 * The lab switcher (M28): Projects, Articles and Videos are one place with three views. A hairline
 * indicator sits under the current one and slides when the page changes (CSS only, from `--i`). Used by
 * the three lab index pages, above their results.
 */
export function LabSwitcher({
  current,
  className,
}: {
  current: LabKey;
  className?: string;
}) {
  const index = LAB.findIndex((item) => item.key === current);
  return (
    <nav
      aria-label="The lab"
      className={cn("lab-switcher", className)}
      style={{ "--i": index } as React.CSSProperties}
    >
      <ul>
        {LAB.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.key === current ? "page" : undefined}
              className="t-eyebrow"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
