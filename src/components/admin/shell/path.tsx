import Link from "next/link";
import { navHrefs } from "./nav";

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** The current admin route as a Mono system path (`/admin/case-studies/edit/:id`). */
export function ConsolePath({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  return (
    <nav aria-label="Breadcrumb" className="cs-path">
      <ol>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`;
          const last = index === segments.length - 1;
          const label = OBJECT_ID.test(segment) ? ":id" : segment;
          return (
            <li key={href}>
              <span aria-hidden="true" className="cs-path__sep">
                /
              </span>
              {last ? (
                <span aria-current="page">{label}</span>
              ) : navHrefs.has(href) ? (
                <Link href={href}>{label}</Link>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
