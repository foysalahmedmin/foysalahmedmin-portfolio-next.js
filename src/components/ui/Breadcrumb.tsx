import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "./Icon";

export type TBreadcrumbs = {
  index: number;
  name: string;
  href?: string;
  description?: string;
  icon?: string;
}[];

type TBreadcrumbItemProps = {
  href?: string;
  className?: string;
  children: ReactNode;
};

type TBreadcrumbProps = {
  items: TBreadcrumbs;
};

const BreadcrumbItem = ({
  children,
  href: path,
  className,
}: TBreadcrumbItemProps) => {
  if (path) {
    return (
      <Link href={path} className={cn("hover:text-accent", className)}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
};

const Breadcrumb = ({ items }: TBreadcrumbProps) => {
  if (!items.length) return null;

  const [firstItem, ...restItems] = items;

  return (
    <nav className="text-muted-foreground flex items-center space-x-1 text-sm">
      {/* First breadcrumb */}
      <div className="flex items-center space-x-1">
        <BreadcrumbItem
          href={firstItem.href}
          className="bg-accent/5 text-foreground border-accent relative flex items-center gap-1 rounded-e-md border-l px-2 py-0.5 font-semibold transition-colors"
        >
          {firstItem?.icon && (
            <Icon name={firstItem?.icon || ""} className="text-accent size-4" />
          )}
          {firstItem.name}
        </BreadcrumbItem>

        {restItems.length > 0 && (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
      </div>

      {/* Remaining breadcrumbs */}
      {restItems?.map((item, i) => {
        const isLast = i === restItems.length - 1;

        return (
          <div key={item.index} className="flex items-center space-x-1">
            <BreadcrumbItem
              href={!isLast ? item.href : undefined}
              className={cn("transition-colors", !isLast && "text-foreground")}
            >
              {item.name}
            </BreadcrumbItem>
            {!isLast && (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
