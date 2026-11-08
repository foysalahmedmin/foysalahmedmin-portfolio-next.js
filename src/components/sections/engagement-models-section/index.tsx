import type {
  TPublicSiteDto,
  TSiteEngagementModel,
} from "@/app/api/site/site.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";

type Props = Readonly<{ site: TPublicSiteDto; heading?: string }>;

const EYEBROW = "Engagement";
const LEAD = "Scope and timing are written down before work starts.";
/** What the last column says when nothing about price or duration is confirmed. Never a number. */
export const SCOPED_LABEL = "Scoped per project";

const COLUMNS = [
  "Model",
  "Best when",
  "You get",
  "How it runs",
  "Starting point",
] as const;

/** Price and duration are only public once the owner has verified them; the data layer drops the rest, and so does this. */
const startingPoint = (model: TSiteEngagementModel): string[] =>
  model.verification === "verified"
    ? [model.price_label, model.duration_label].filter(
        (value): value is string => Boolean(value)
      )
    : [];

/**
 * Chapter 5b, engagement (docs plan 4.1b): a spec sheet of the ways to work together, not cards. A
 * real table with row headers; below 900 px each row becomes a stacked list of labelled values, with
 * the same markup (the roles keep the table semantics when CSS changes the display). It continues the
 * process band in the same tone, with no seam. The seed ships every model off, so on a fresh install
 * this renders nothing. The "this is for you if" lines belong to the Fit check, not here.
 */
export default function EngagementModelsSection({ site, heading }: Props) {
  const models = (site.engagement_models ?? []).filter(
    (model) => model.enabled
  );
  if (!models.length) return null;

  return (
    <section
      id="engagement"
      aria-labelledby="engagement-heading"
      data-band
      data-tone="paper"
      className="engagement-band"
    >
      <div className="container">
        <Reveal>
          <SectionHead
            eyebrow={EYEBROW}
            title={heading || "Ways to work together"}
            titleId="engagement-heading"
            lead={LEAD}
          />
        </Reveal>

        <Reveal className="engagement-sheet">
          <table className="engagement-table" role="table">
            <caption className="sr-only">
              How the ways of working together compare
            </caption>
            <thead role="rowgroup">
              <tr role="row">
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    role="columnheader"
                    className="t-eyebrow"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {models.map((model) => {
                const start = startingPoint(model);
                return (
                  <tr key={model.key} role="row">
                    <th
                      scope="row"
                      role="rowheader"
                      className="engagement-name"
                    >
                      {model.name}
                    </th>
                    <td role="cell" data-label={COLUMNS[1]}>
                      {model.best_when}
                    </td>
                    <td role="cell" data-label={COLUMNS[2]}>
                      {model.you_get.length ? (
                        <ul className="engagement-gets" role="list">
                          {model.you_get.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                    <td role="cell" data-label={COLUMNS[3]}>
                      {model.how_it_runs}
                    </td>
                    <td role="cell" data-label={COLUMNS[4]}>
                      {start.length ? (
                        start.map((value) => (
                          <span key={value} className="engagement-start">
                            {value}
                          </span>
                        ))
                      ) : (
                        <span className="engagement-start" data-scoped="">
                          {SCOPED_LABEL}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
