import { ArchetypesSection } from "@/components/design-system/archetypes-section";
import { ComponentsSection } from "@/components/design-system/components-section";
import { GlassSection } from "@/components/design-system/glass-section";
import { MotionSection } from "@/components/design-system/motion-section";
import {
  RampSection,
  SemanticSection,
} from "@/components/design-system/tokens-section";
import { TypeSection } from "@/components/design-system/type-section";
import { Container, Section, Stack } from "@/components/ui/layout";
import type { ReactNode } from "react";

export const metadata = {
  title: "System lab",
  robots: { index: false, follow: false },
};

const sections: ReadonlyArray<{
  id: string;
  title: string;
  lede: string;
  content: ReactNode;
}> = [
  {
    id: "ramp",
    title: "Monochrome ramp",
    lede: "Thirteen greys carry everything. White is for highlights only, never text.",
    content: <RampSection />,
  },
  {
    id: "semantic",
    title: "Semantic tokens, ink and paper",
    lede: "The same names resolve differently per tone. State is never a hue.",
    content: <SemanticSection />,
  },
  {
    id: "type",
    title: "Type",
    lede: "Archivo for statements (width is a semantic axis), Instrument Sans for text, Martian Mono for annotation.",
    content: <TypeSection />,
  },
  {
    id: "glass",
    title: "Glass tiers",
    lede: "Used only where a rich backdrop exists, and only within the contrast rules.",
    content: <GlassSection />,
  },
  {
    id: "components",
    title: "Components by state, tone, density and surface",
    lede: "Every component in every state, in both tones and both densities. The fastest consistency regression target.",
    content: <ComponentsSection />,
  },
  {
    id: "archetypes",
    title: "Archetype templates",
    lede: "Every route belongs to one archetype and one template. Pages compose a template; they never rebuild a header or a call-to-action band.",
    content: <ArchetypesSection />,
  },
  {
    id: "motion",
    title: "Motion lab",
    lede: "Duration and easing tokens. The full effect registry lands with the motion engine.",
    content: <MotionSection />,
  },
];

export default function SystemLabPage() {
  return (
    <Section>
      <Container>
        <Stack gap="xl">
          <Stack gap="sm">
            <p className="type-label text-primary">Private reference</p>
            <h1 className="type-heading-1">System lab</h1>
            <p className="type-lead">
              The single reference for the Signal design system. The frames
              below render the new tokens inside their own surface, so this page
              can show ink and paper, comfortable and compact, public and
              console side by side while the admin around it keeps its legacy
              look until Phase 7.
            </p>
            <nav
              aria-label="Sections"
              className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
            >
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="underline underline-offset-4"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </Stack>

          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
            >
              <Stack gap="md">
                <div>
                  <h2 id={`${section.id}-title`} className="type-heading-2">
                    {section.title}
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-prose">
                    {section.lede}
                  </p>
                </div>
                {section.content}
              </Stack>
            </section>
          ))}
        </Stack>
      </Container>
    </Section>
  );
}
