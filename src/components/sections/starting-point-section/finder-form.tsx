"use client";

import type { TSiteFinder } from "@/app/api/site/site.type";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  finderContactHref,
  isFinderComplete,
  resolveFinderResult,
  type TFinderAnswers,
  type TFinderModelName,
} from "@/lib/site/finder";
import Link from "next/link";
import { useState } from "react";

export type FinderFormProps = Readonly<{
  finder: TSiteFinder;
  models: readonly TFinderModelName[];
}>;

/**
 * The finder's inline questions and its suggestion (docs plan 4.1, Ch.5d). Everything is computed in this
 * browser from the rules in `Site.finder`: nothing is sent, stored or tracked. Native radio groups give
 * the keyboard path (arrow keys inside a group, Tab between groups) and the result is a polite live region.
 */
export default function FinderForm({ finder, models }: FinderFormProps) {
  const [answers, setAnswers] = useState<TFinderAnswers>({});
  const complete = isFinderComplete(finder, answers);
  const result = complete ? resolveFinderResult(finder, models, answers) : null;
  const href = finderContactHref(finder, answers, result?.engagement_key);

  return (
    <form className="finder-form" onSubmit={(event) => event.preventDefault()}>
      <div className="finder-steps">
        {finder.steps.map((step) => (
          <fieldset key={step.key} className="finder-step">
            <legend className="finder-question">{step.question}</legend>
            <div className="finder-options">
              {step.options.map((option) => (
                <label key={option.key} className="finder-option">
                  <input
                    type="radio"
                    name={`finder-${step.key}`}
                    value={option.key}
                    checked={answers[step.key] === option.key}
                    onChange={() =>
                      setAnswers((current) => ({
                        ...current,
                        [step.key]: option.key,
                      }))
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div
        className="finder-result glass-inner"
        aria-live="polite"
        data-state={complete ? (result ? "match" : "open") : "idle"}
      >
        {!complete ? (
          <p className="finder-result__hint">
            Answer each question for a suggestion.
          </p>
        ) : (
          <>
            {result ? (
              <>
                <p className="t-eyebrow text-fg-secondary">Start with</p>
                <p className="finder-result__model">{result.engagement_name}</p>
                <p className="finder-result__reason">{result.reasoning}</p>
              </>
            ) : (
              <p className="finder-result__reason">
                No single starting point stands out for these answers. Describe
                the problem and I will tell you honestly what I would do first.
              </p>
            )}
            <Link href={href} className={buttonVariants({ size: "lg" })}>
              Describe it
            </Link>
          </>
        )}
      </div>
    </form>
  );
}
