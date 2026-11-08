import type { TPublicSitePillarDto } from "@/app/api/site/site.type";
import type { TPublicSkillDto } from "@/app/api/skills/skill.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";
import { MonoLabel } from "@/components/ui/mono-label";
import { getPillarLabel, type PillarKey } from "@/lib/content/pillars";
import type { TPublicSkillGroupWithSkills } from "./index";

const LEAD = "Chosen for the problem, never the other way round.";

export const proficiencyLabel = (
  value: TPublicSkillDto["proficiency_level"]
) =>
  value === "foundational"
    ? "Foundation"
    : value === "working"
      ? "Working"
      : value === "advanced"
        ? "Advanced"
        : "Expert";

type RegistryEntry = Readonly<{ key: string; name: string; detail?: string }>;
type RegistryGroup = Readonly<{
  key: string;
  title: string;
  pillar?: PillarKey;
  entries: readonly RegistryEntry[];
}>;

/** Level and years are shown only when the evidence behind them is verified; a derived level stays out. */
const skillEntry = (skill: TPublicSkillDto): RegistryEntry => {
  const verified = skill.proficiency_verification === "verified";
  const detail = verified
    ? [
        proficiencyLabel(skill.proficiency_level),
        skill.years_experience
          ? `${skill.years_experience} ${skill.years_experience === 1 ? "yr" : "yrs"}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;
  return { key: skill.slug, name: skill.title, detail };
};

/**
 * Chapter 6, the capability registry (docs plan 4.1): a compact mono grid with hairlines, grouped by the
 * skill groups the data gives. Names only; no ratings. Without published skill groups it falls back to
 * the capabilities and technologies the Site holds for each role. A server component with Reveal only.
 */
export default function SkillsRegistry({
  pillars,
  groups,
  heading,
}: {
  pillars: readonly TPublicSitePillarDto[];
  groups: readonly TPublicSkillGroupWithSkills[];
  heading?: string;
}) {
  const registry: RegistryGroup[] = groups.length
    ? groups.map((group) => ({
        key: group.slug,
        title: group.title,
        pillar: group.primary_pillar,
        entries: group.skills.map(skillEntry),
      }))
    : pillars
        .filter((pillar) => pillar.enabled)
        .map((pillar) => ({
          key: pillar.key,
          title: pillar.label,
          pillar: pillar.key,
          entries: [
            ...new Set([...pillar.capabilities, ...pillar.technologies]),
          ].map((name) => ({ key: name, name })),
        }));

  return (
    <section
      id="skills"
      aria-labelledby="skills-heading"
      data-chapter="skills"
      data-chapter-label="Capabilities"
      className="py-[var(--space-section)]"
    >
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow="/skills"
            title={heading || "The tools behind the solutions"}
            titleId="skills-heading"
            lead={LEAD}
          />
        </Reveal>

        <div className="registry">
          {registry.map((group, index) => (
            <Reveal
              key={group.key}
              as="div"
              index={index}
              count={registry.length}
              className="registry-group"
            >
              {group.pillar ? (
                <MonoLabel className="text-fg-secondary">
                  {getPillarLabel(group.pillar)}
                </MonoLabel>
              ) : null}
              <h3 className="registry-group__title">{group.title}</h3>
              <ul className="registry-entries" aria-label={group.title}>
                {group.entries.map((entry) => (
                  <li key={entry.key} className="registry-entry">
                    <span>{entry.name}</span>
                    {entry.detail ? (
                      <span className="registry-entry__detail">
                        {entry.detail}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
