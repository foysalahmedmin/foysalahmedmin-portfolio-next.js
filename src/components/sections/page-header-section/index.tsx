"use client";

import { Breadcrumb, TBreadcrumbs } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import React from "react";

interface PageHeaderSectionProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbItems?: TBreadcrumbs;
  className?: string;
  align?: "left" | "center";
}

const PageHeaderSection: React.FC<PageHeaderSectionProps> = ({
  title,
  subtitle,
  description,
  breadcrumbItems,
  className,
  align = "center",
}) => {
  // Function to wrap words in a span for primary coloring
  // This is a simple implementation, usually titles like "About Me" 
  // want "Me" highlighted. 
  const renderTitle = (text: string) => {
    const words = text.split(" ");
    if (words.length <= 1) return text;
    
    const lastWord = words.pop();
    return (
      <>
        {words.join(" ")} <span className="text-primary">{lastWord}</span>
      </>
    );
  };

  return (
    <section className={cn("bg-muted/30 border-border border-b py-20 lg:py-32", className)}>
      <div className="container mx-auto px-6">
        <div className={cn("flex flex-col gap-6", align === "center" ? "items-center text-center" : "items-start text-left")}>
          
          {breadcrumbItems && (
            <div className="fade-down">
              <Breadcrumb items={breadcrumbItems} />
            </div>
          )}

          <div className="max-w-3xl">
            {subtitle && (
              <span className="text-primary mb-3 inline-block text-sm font-bold tracking-widest uppercase fade-down">
                {subtitle}
              </span>
            )}
            <h1 className="fade-down text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
              {renderTitle(title)}
            </h1>
            {description && (
              <p className="fade-up text-muted-foreground mx-auto mt-6 text-lg leading-relaxed md:text-xl">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PageHeaderSection;
