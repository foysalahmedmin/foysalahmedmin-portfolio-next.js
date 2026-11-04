import { PageHeader } from "@/components/templates/page-header";
import type { TBreadcrumbs } from "@/components/ui/breadcrumb";
import React from "react";

interface PageHeaderSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbItems?: TBreadcrumbs;
  className?: string;
  /** Kept for source compatibility; the shared header is always left-set. */
  align?: "left" | "center";
}

/**
 * Compatibility wrapper. The shared header lives in `templates/page-header`; this keeps the old
 * import path and props working for callers that render a header from inside a section.
 */
const PageHeaderSection: React.FC<PageHeaderSectionProps> = ({
  title,
  subtitle,
  description,
  breadcrumbItems,
  className,
}) => (
  <PageHeader
    title={title}
    lede={description}
    path={breadcrumbItems}
    eyebrow={subtitle}
    level="detail"
    {...(className ? { className } : {})}
  />
);

export default PageHeaderSection;
