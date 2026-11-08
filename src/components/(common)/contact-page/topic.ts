import type { TPublicServiceDto } from "@/app/api/services/service.type";
import type { TPublicSiteDto } from "@/app/api/site/site.type";

/** Mirrors `CONTACT_FIELD_LIMITS.subject`; the contract module pulls in zod, which the page loads lazily. */
export const SUBJECT_MAX = 200;

export const TOPIC_GROUPS = [
  { key: "systems", label: "Systems" },
  { key: "ai_automation", label: "AI Automation" },
  { key: "other", label: "Something else" },
] as const;

export type TopicGroup = (typeof TOPIC_GROUPS)[number]["key"];

/** What `?topic=` resolved to: a service problem (has a group) or an engagement model (has none). */
export type ContactTopic = Readonly<{
  key: string;
  kind: "problem" | "model";
  group: TopicGroup | null;
  /** The owner's own words: the pain sentence or the model name. Never the raw parameter. */
  label: string;
  /** `Re: <label>`, cut to the subject limit. */
  subject: string;
}>;

export type ContactSearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) || undefined;

export const topicSubject = (label: string) => {
  const subject = `Re: ${label.trim()}`;
  return subject.length > SUBJECT_MAX
    ? `${subject.slice(0, SUBJECT_MAX - 1)}…`
    : subject;
};

/** The subject for a chip choice: the resolved topic's own line when its group is picked, else the group word. */
export const subjectForGroup = (
  group: TopicGroup,
  topic?: ContactTopic | null
) => {
  if (topic && topic.group === group) return topic.subject;
  if (group === "other") return "";
  return `${TOPIC_GROUPS.find((item) => item.key === group)?.label}: `;
};

/** The finder's answers (`?start=a,b`) as the labels of options the site really offers; unknown keys drop out. */
export const resolveStartLabels = (
  value: string | string[] | undefined,
  finder: TPublicSiteDto["finder"]
): string[] => {
  const keys = first(value)?.split(",") ?? [];
  if (!finder || keys.length === 0) return [];
  const labels = new Map(
    finder.steps.flatMap((step) =>
      step.options.map((option) => [option.key, option.label] as const)
    )
  );
  return [...new Set(keys)].flatMap((key) => labels.get(key) ?? []);
};

/**
 * `?topic=<key>`: an engagement model key (from the finder) or a service problem key (from the home).
 * The visitor's string is only ever compared with keys, so nothing from the URL is rendered; an unknown
 * or malformed value gives `null` and the page behaves as if it were absent. Services load only when the
 * key is not a model, so a plain `/contact` never reads them.
 */
export const resolveContactTopic = async (
  value: string | string[] | undefined,
  site: Pick<TPublicSiteDto, "engagement_models">,
  loadServices: () => Promise<readonly TPublicServiceDto[]>
): Promise<ContactTopic | null> => {
  const key = first(value);
  if (!key) return null;

  const model = site.engagement_models.find((item) => item.key === key);
  if (model) {
    return {
      key,
      kind: "model",
      group: null,
      label: model.name,
      subject: topicSubject(model.name),
    };
  }

  for (const service of await loadServices()) {
    const problem = service.problems?.find((item) => item.key === key);
    if (problem) {
      return {
        key,
        kind: "problem",
        group:
          service.primary_pillar === "ai_automation"
            ? "ai_automation"
            : "systems",
        label: problem.pain,
        subject: topicSubject(problem.pain),
      };
    }
  }
  return null;
};
