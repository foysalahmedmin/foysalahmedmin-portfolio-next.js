import type {
  TSiteEngagementModel,
  TSiteFinder,
} from "@/app/api/site/site.type";

/**
 * The starting-point finder's rules (docs plan 4.1, Ch.5d). Pure and server-safe: the browser form and the
 * tests run the same functions over `Site.finder`, so a suggestion is computed entirely on the visitor's
 * device and nothing about the answers is sent or stored.
 */

/** The chosen option key per step key. */
export type TFinderAnswers = Readonly<Record<string, string>>;

export type TFinderModelName = Pick<TSiteEngagementModel, "key" | "name">;

export type TFinderResult = Readonly<{
  engagement_key: string;
  engagement_name: string;
  reasoning: string;
}>;

/** The option the visitor chose for each step, in step order. A step with no valid answer is skipped. */
export const chosenOptions = (finder: TSiteFinder, answers: TFinderAnswers) =>
  finder.steps.flatMap((step) => {
    const option = step.options.find((item) => item.key === answers[step.key]);
    return option ? [option] : [];
  });

export const isFinderComplete = (
  finder: TSiteFinder,
  answers: TFinderAnswers
) =>
  finder.steps.length > 0 &&
  chosenOptions(finder, answers).length === finder.steps.length;

/**
 * The outcome whose `when_tags` are all covered by the chosen options' tags. The outcome that asks for the
 * most tags wins (it is the most specific); a tie goes to the first listed. An outcome with no tags is a
 * catch-all that only wins when nothing more specific matches.
 */
export const matchFinderOutcome = (
  finder: TSiteFinder,
  answers: TFinderAnswers,
  outcomes: TSiteFinder["outcomes"] = finder.outcomes
): TSiteFinder["outcomes"][number] | null => {
  const tags = new Set(
    chosenOptions(finder, answers).flatMap((option) => option.tags)
  );
  let best: TSiteFinder["outcomes"][number] | null = null;
  let bestSize = -1;
  for (const outcome of outcomes) {
    const wanted = new Set(outcome.when_tags);
    if (![...wanted].every((tag) => tags.has(tag))) continue;
    if (wanted.size > bestSize) {
      best = outcome;
      bestSize = wanted.size;
    }
  }
  return best;
};

/**
 * The suggestion for the answers given, naming an engagement model the site really offers. An outcome that
 * points at a model that is not public is passed over, never shown under an invented name.
 */
export const resolveFinderResult = (
  finder: TSiteFinder,
  models: readonly TFinderModelName[],
  answers: TFinderAnswers
): TFinderResult | null => {
  const names = new Map(models.map((model) => [model.key, model.name]));
  const outcome = matchFinderOutcome(
    finder,
    answers,
    finder.outcomes.filter((item) => names.has(item.engagement_key))
  );
  if (!outcome) return null;
  return {
    engagement_key: outcome.engagement_key,
    engagement_name: names.get(outcome.engagement_key)!,
    reasoning: outcome.reasoning,
  };
};

/** `/contact?topic=<engagement key>&start=<option keys, comma separated>`, URL-encoded. */
export const finderContactHref = (
  finder: TSiteFinder,
  answers: TFinderAnswers,
  engagementKey?: string
) => {
  const params = new URLSearchParams();
  if (engagementKey) params.set("topic", engagementKey);
  const start = chosenOptions(finder, answers).map((option) => option.key);
  if (start.length) params.set("start", start.join(","));
  const query = params.toString();
  return query ? `/contact?${query}` : "/contact";
};
