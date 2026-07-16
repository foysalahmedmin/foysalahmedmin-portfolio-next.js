import {
  Cluster,
  Container,
  Grid,
  Section,
  Stack,
} from "@/components/ui/layout";

const pillars = [
  ["Frontend Engineering", "bg-pillar-frontend", "bg-pillar-frontend-surface"],
  ["Backend Engineering", "bg-pillar-backend", "bg-pillar-backend-surface"],
  ["AI Automation", "bg-pillar-ai", "bg-pillar-ai-surface"],
  ["System Design", "bg-pillar-system", "bg-pillar-system-surface"],
  [
    "Full-Stack Development",
    "bg-pillar-full-stack",
    "bg-pillar-full-stack-surface",
  ],
] as const;

export const metadata = {
  title: "Design system preview",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return (
    <Section>
      <Container>
        <Stack gap="xl">
          <Stack gap="sm">
            <p className="type-label text-primary">Private system preview</p>
            <h1 className="type-heading-1">Portfolio product language</h1>
            <p className="type-lead">
              A semantic, accessible foundation shared by the public experience
              and administration workspace.
            </p>
          </Stack>

          <section aria-labelledby="pillar-token-title">
            <Stack gap="md">
              <h2 id="pillar-token-title" className="type-heading-2">
                Five-pillar accents
              </h2>
              <Grid columns={3}>
                {pillars.map(([label, accent, surface]) => (
                  <article
                    key={label}
                    className={`${surface} border-border rounded-[var(--radius-xl-token)] border p-6 shadow-[var(--shadow-sm)]`}
                  >
                    <div className={`${accent} mb-8 size-12 rounded-full`} />
                    <h3 className="type-heading-3">{label}</h3>
                  </article>
                ))}
              </Grid>
            </Stack>
          </section>

          <section aria-labelledby="status-token-title">
            <Stack gap="md">
              <h2 id="status-token-title" className="type-heading-2">
                Semantic status
              </h2>
              <Cluster>
                <span className="bg-success text-success-foreground rounded-full px-4 py-2 font-semibold">
                  Ready
                </span>
                <span className="bg-warning text-warning-foreground rounded-full px-4 py-2 font-semibold">
                  Needs review
                </span>
                <span className="bg-info text-info-foreground rounded-full px-4 py-2 font-semibold">
                  In progress
                </span>
                <span className="bg-destructive text-destructive-foreground rounded-full px-4 py-2 font-semibold">
                  Failed
                </span>
              </Cluster>
            </Stack>
          </section>

          <section className="editorial" aria-labelledby="editorial-title">
            <h2 id="editorial-title">Editorial rhythm</h2>
            <p>
              Long-form content keeps a readable measure, visible focus, stable
              tables, and predictable code overflow across compact and wide
              screens.
            </p>
            <blockquote>
              Design decisions should make technical evidence easier to trust.
            </blockquote>
            <pre>
              <code>{`const pillars = 5 as const;`}</code>
            </pre>
          </section>
        </Stack>
      </Container>
    </Section>
  );
}
