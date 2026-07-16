import type { TPublicSitePillarDto } from "@/app/api/site/site.type";
import type { TPublicSkillGroupDto } from "@/app/api/skill-groups/skill-group.type";
import type { TPublicSkillDto } from "@/app/api/skills/skill.type";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { getPillarLabel } from "@/lib/content/pillars";

export type TPublicSkillGroupWithSkills = TPublicSkillGroupDto & {
  skills: readonly TPublicSkillDto[];
};

const proficiencyLabel = (value: TPublicSkillDto["proficiency_level"]) =>
  value === "foundational"
    ? "Foundation"
    : value === "working"
      ? "Working"
      : value === "advanced"
        ? "Advanced"
        : "Expert";

export default function SkillsSection({
  pillars,
  groups = [],
  heading,
}: {
  pillars: readonly TPublicSitePillarDto[];
  groups?: readonly TPublicSkillGroupWithSkills[];
  heading?: string;
}) {
  const fallbackGroups = pillars
    .filter((pillar) => pillar.enabled)
    .map((pillar) => ({
      key: pillar.key,
      title: pillar.label,
      summary:
        pillar.summary ||
        "Published evidence records for this discipline are being prepared.",
      primary_pillar: pillar.key,
      capabilities: pillar.capabilities,
      technologies: pillar.technologies,
    }));

  return (
    <section id="skills" className="py-[var(--space-section)]">
      <div className="container">
        <SectionTitle>
          <Subtitle>Evidence, not decorative ratings</Subtitle>
          <Title>{heading || "A connected five-discipline skill map"}</Title>
          <Description>
            Published skills appear only after their supporting project,
            credential, writing, or reviewed work-history reference passes the
            public evidence boundary.
          </Description>
        </SectionTitle>

        <ol className="grid gap-6 lg:grid-cols-5">
          {groups.length
            ? groups.map((group) => (
                <li
                  key={group.slug}
                  className="border-border bg-surface-raised rounded-[var(--radius-lg-token)] border p-6 shadow-[var(--shadow-xs)]"
                >
                  <p className="text-primary text-xs font-black tracking-[0.14em] uppercase">
                    {group.primary_pillar
                      ? getPillarLabel(group.primary_pillar)
                      : "Evidence group"}
                  </p>
                  <h3 className="mt-3 text-lg leading-tight font-bold">
                    {group.title}
                  </h3>
                  <p className="text-muted-foreground mt-4 text-sm leading-6">
                    {group.description || group.summary}
                  </p>
                  <ul className="mt-6 space-y-3" aria-label={group.title}>
                    {group.skills.map((skill) => (
                      <li
                        key={skill.slug}
                        className="border-border border-t pt-3 first:border-0 first:pt-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-bold">
                            {skill.title}
                          </span>
                          <span
                            className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-[0.62rem] font-black tracking-wide uppercase"
                            title={`${skill.proficiency_verification} evidence`}
                          >
                            {proficiencyLabel(skill.proficiency_level)}
                          </span>
                        </div>
                        {skill.keywords.length > 0 && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">
                            {skill.keywords.slice(0, 4).join(" · ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))
            : fallbackGroups.map((group) => (
                <li
                  key={group.key}
                  className="border-border bg-surface-raised rounded-[var(--radius-lg-token)] border p-6 shadow-[var(--shadow-xs)]"
                >
                  <p className="text-primary text-xs font-black tracking-[0.14em] uppercase">
                    {getPillarLabel(group.primary_pillar)}
                  </p>
                  <h3 className="mt-3 text-lg leading-tight font-bold">
                    {group.title}
                  </h3>
                  <p className="text-muted-foreground mt-4 text-sm leading-6">
                    {group.summary}
                  </p>
                  {[...new Set([...group.capabilities, ...group.technologies])]
                    .slice(0, 8)
                    .map((signal) => (
                      <span
                        key={signal}
                        className="bg-muted mt-2 mr-2 inline-flex rounded-md px-2.5 py-1 text-xs font-semibold"
                      >
                        {signal}
                      </span>
                    ))}
                </li>
              ))}
        </ol>
      </div>
    </section>
  );
}
