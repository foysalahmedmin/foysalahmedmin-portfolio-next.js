import type { TPublicShellLink } from "@/lib/site/public-shell";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type PublicSiteLinkProps = {
  link: TPublicShellLink;
  className?: string;
  children?: ReactNode;
  showIcon?: boolean;
};

export const PublicSiteLink = ({
  link,
  className,
  children,
  showIcon = false,
}: PublicSiteLinkProps) => {
  const content = (
    <>
      {children ?? link.label}
      {showIcon &&
        (link.external ? (
          <ArrowUpRight className="size-4" aria-hidden="true" />
        ) : (
          <ArrowRight className="size-4" aria-hidden="true" />
        ))}
    </>
  );

  if (link.external) {
    return (
      <a
        href={link.href}
        className={className}
        target={link.href.startsWith("https:") ? "_blank" : undefined}
        rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  );
};
