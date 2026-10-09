import type { TPublicSiteDto } from "@/app/api/site/site.type";
import type { ReactNode } from "react";
import type { PublicArchetypeId } from "./archetypes";
import { CtaBand } from "./cta-band";
import { PageHeader, type PageHeaderProps } from "./page-header";
import { TemplateRoot, type TemplateIdentity } from "./template-root";

export type PageTemplateProps = TemplateIdentity & {
  /** Needed only to render the CtaBand. */
  site?: TPublicSiteDto | undefined;
  /** Omit (or pass null) when the body renders its own header, for example a legal document. */
  header?: PageHeaderProps | null | undefined;
  /** Render the shared CtaBand after the body. Defaults per archetype. */
  cta?: boolean | undefined;
  children: ReactNode;
};

/**
 * Shared composition behind every public template: `<main>` carrying the archetype, the shared
 * PageHeader, the body, and the opposite-tone CtaBand (docs plan 3.13). The named templates fix the
 * archetype and its defaults so a page never assembles these pieces itself.
 */
export function composePage(
  archetype: PublicArchetypeId,
  defaults: { cta: boolean; level: PageHeaderProps["level"] },
  { site, header, cta, children, ...identity }: PageTemplateProps
) {
  const withCta = cta ?? defaults.cta;
  return (
    <TemplateRoot archetype={archetype} {...identity}>
      {header ? <PageHeader level={defaults.level} {...header} /> : null}
      {children}
      {withCta && site ? <CtaBand site={site} /> : null}
    </TemplateRoot>
  );
}
