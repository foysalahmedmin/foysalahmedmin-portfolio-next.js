import type { TPublicSiteDto } from "@/app/api/site/site.type";
import type { CSSProperties } from "react";
import type { ContactTopic } from "../topic";
import ContactForm from "./contact-form";

type Props = Readonly<{
  site?: TPublicSiteDto | undefined;
  /** What `?topic=` resolved to on the server, or null. The page works the same without it. */
  topic?: ContactTopic | null | undefined;
  /** Labels of the finder answers carried by `?start=`. */
  startLabels?: readonly string[] | undefined;
}>;

/**
 * The contact conversation (A6): an ink panel. The left column is what the visitor can rely on (what
 * happens next, the public email, the working hours); the right is the glass form. The form is the only
 * client code on the page. There is no map: the owner decided against one.
 */
export default function ContactContentSection({
  site,
  topic,
  startLabels,
}: Props) {
  const contact = site?.contact;
  const steps = site?.next_steps ?? [];
  const facts = [
    {
      label: "Email",
      value: contact?.public_email ? (
        <a
          href={`mailto:${contact.public_email}`}
          className="break-all underline underline-offset-4"
        >
          {contact.public_email}
        </a>
      ) : null,
    },
    { label: "Working hours", value: contact?.working_hours },
    { label: "Location", value: contact?.location },
    { label: "Availability", value: contact?.availability_label },
  ].filter((fact) => Boolean(fact.value));

  return (
    <section
      data-tone="ink"
      data-band
      aria-labelledby="cv-form-heading"
      className="cv"
    >
      <div className="hairline-grid cv-backdrop" aria-hidden="true" />
      <div className="cv-grid container">
        {steps.length > 0 || facts.length > 0 ? (
          <div className="cv-aside">
            {steps.length > 0 ? (
              <div className="cv-next">
                <h2 id="cv-next-heading" className="t-eyebrow">
                  What happens next
                </h2>
                <ol
                  className="cv-steps"
                  role="list"
                  aria-labelledby="cv-next-heading"
                >
                  {steps.map((step, index) => (
                    <li
                      key={step.key}
                      style={{ "--t": index / steps.length } as CSSProperties}
                    >
                      <span className="cv-steps__title">{step.title}</span>
                      <span className="cv-steps__summary">{step.summary}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {facts.length > 0 ? (
              <dl className="cv-facts">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="t-eyebrow">{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}

        <ContactForm
          key={topic?.key ?? "none"}
          topic={topic ?? null}
          startLabels={startLabels ?? []}
          responsePromise={contact?.response_promise}
        />
      </div>
    </section>
  );
}
