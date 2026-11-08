import type { TPublicCredentialDto } from "@/app/api/credentials/credential.type";
import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import type { TPublicTestimonialDto } from "@/app/api/testimonials/testimonial.type";
import type { TPublicTimelineEntryDto } from "@/app/api/timeline/timeline-entry.type";
import TrustedRichText from "@/components/content/trusted-rich-text";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import OptimizedMedia from "@/components/ui/optimized-media";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { TextLink } from "@/components/ui/text-link";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import { HelpCircle, Quote, ShieldCheck } from "lucide-react";

const formatMonth = (value: string): string => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date)
    : "Date unavailable";
};

const EmptyEvidence = ({
  title,
  unavailable,
}: {
  title: string;
  unavailable?: boolean;
}) => (
  <div className="border-border bg-surface-subtle rounded-xl border p-8 text-center">
    <h3 className="font-bold">
      {unavailable
        ? `${title} are temporarily unavailable`
        : `No ${title.toLowerCase()} are published yet`}
    </h3>
    <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm leading-6">
      {unavailable
        ? "The public evidence reader could not be reached. No substitute claims are being shown."
        : "Unreviewed or incomplete records remain private until their publication checks pass."}
    </p>
  </div>
);

const formatRange = (entry: TPublicTimelineEntryDto) => (
  <>
    <time dateTime={entry.started_at}>{formatMonth(entry.started_at)}</time>
    {" – "}
    {entry.is_current ? (
      "Present"
    ) : entry.ended_at ? (
      <time dateTime={entry.ended_at}>{formatMonth(entry.ended_at)}</time>
    ) : (
      "Date not published"
    )}
  </>
);

/**
 * The chronology as a wire (M19): a vertical line drawn by the scroll engine (`--progress` on
 * `[data-scroll-progress]`), with hairline entries that light as the wire reaches them. A server
 * component; without the engine `--progress` is 1, so the wire is whole and every entry is lit.
 */
export const TimelineSection = ({
  entries,
  unavailable,
  heading,
}: {
  entries: readonly TPublicTimelineEntryDto[];
  unavailable?: boolean;
  heading?: string;
}) => (
  <section
    id="timeline"
    className="nr-timeline"
    aria-labelledby="timeline-title"
  >
    <div className="container">
      <Reveal>
        <SectionHead
          eyebrow="Verified chronology"
          title={heading || "Experience and education"}
          titleId="timeline-title"
          lead="Only reviewed entries are public. The proof behind each one stays private."
        />
      </Reveal>
      {entries.length ? (
        <div
          className="nr-wire"
          data-scroll-progress=""
          data-progress-range="top 60%,bottom 60%"
        >
          <span className="nr-rail" aria-hidden="true">
            <span className="nr-fill" />
            <span className="nr-pulse" />
          </span>
          <ol
            role="list"
            className="nr-entries"
            aria-label="Experience and education"
          >
            {entries.map((entry, index) => (
              <li
                key={entry.slug}
                className="nr-entry"
                style={
                  {
                    "--at": (index / entries.length).toFixed(4),
                  } as CSSProperties
                }
              >
                <p className="nr-when t-mono">
                  <span>{formatRange(entry)}</span>
                  <span className="nr-type t-eyebrow">{entry.type}</span>
                </p>
                <div className="nr-body">
                  <h3 className="nr-title t-h4">{entry.position}</h3>
                  <p className="nr-org">
                    {entry.organization}
                    {entry.location ? ` · ${entry.location}` : ""}
                  </p>
                  {entry.summary ? (
                    <p className="nr-summary">{entry.summary}</p>
                  ) : null}
                  {entry.highlights.length > 0 && (
                    <ul className="nr-points" role="list">
                      {entry.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  )}
                  {entry.technologies.length > 0 && (
                    <p className="nr-tech t-eyebrow">
                      {entry.technologies.slice(0, 8).join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <EmptyEvidence title="Timeline records" unavailable={unavailable} />
      )}
    </div>
  </section>
);

/** Verified credentials as a compact registry: one hairline row each, the issuer link only where it is safe. */
export const CredentialsSection = ({
  credentials,
  unavailable,
  heading,
}: {
  credentials: readonly TPublicCredentialDto[];
  unavailable?: boolean;
  heading?: string;
}) => (
  <section
    id="credentials"
    className="nr-credentials"
    aria-labelledby="credentials-title"
  >
    <div className="container">
      <Reveal>
        <SectionHead
          eyebrow="Reviewed credentials"
          title={heading || "Credentials and continued learning"}
          titleId="credentials-title"
          lead="Issuer and date are shown only for verified public records."
        />
      </Reveal>
      {credentials.length ? (
        <ul role="list" className="nr-registry">
          {credentials.map((credential) => (
            <li key={credential.slug} className="nr-cred">
              <h3 className="nr-cred-title">{credential.title}</h3>
              <p className="nr-cred-meta t-mono">
                {credential.issuer} · {formatMonth(credential.issued_at)}
              </p>
              {credential.credential_url &&
              isAllowedPublicProjectUrl(credential.credential_url) ? (
                <TextLink
                  href={credential.credential_url}
                  variant="quiet"
                  external
                  className="nr-cred-link"
                >
                  Verify with issuer
                  <span className="sr-only">: {credential.title}</span>
                </TextLink>
              ) : null}
              {credential.summary ? (
                <p className="nr-cred-summary">{credential.summary}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyEvidence title="Credentials" unavailable={unavailable} />
      )}
    </div>
  </section>
);

export const FAQSection = ({
  faqs,
  unavailable,
  heading,
}: {
  faqs: readonly TPublicFAQDto[];
  unavailable?: boolean;
  heading?: string;
  layout?: string;
}) => {
  // A category label only helps when the list mixes categories (the Contact page filters to one)
  const showCategory = new Set(faqs.map((faq) => faq.category)).size > 1;
  return (
    <section
      id="faq"
      className="py-[var(--space-section)]"
      aria-labelledby="faq-title"
    >
      <div className="container">
        <div className="mx-auto grid max-w-3xl gap-10">
          <SectionHead
            align="center"
            eyebrow="Useful before a conversation"
            title={heading || "Questions before we start"}
            titleId="faq-title"
            lead="Clear expectations make the first call sharper: scope, delivery, security, communication and proof, answered before a project starts."
          />

          {faqs.length ? (
            <Accordion>
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.slug}
                  name="faq"
                  title={
                    showCategory ? (
                      <span className="faq-question">
                        <span className="t-eyebrow text-fg-secondary">
                          {faq.category}
                        </span>
                        <span>{faq.question}</span>
                      </span>
                    ) : (
                      faq.question
                    )
                  }
                  open={index === 0}
                >
                  <TrustedRichText
                    html={faq.answer}
                    className="editorial text-fg-secondary max-w-none whitespace-pre-line"
                  />
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <EmptyEvidence title="FAQs" unavailable={unavailable} />
          )}
        </div>
      </div>
    </section>
  );
};

export const TestimonialsSection = ({
  testimonials,
  unavailable,
  heading,
}: {
  testimonials: readonly TPublicTestimonialDto[];
  unavailable?: boolean;
  heading?: string;
}) => {
  return (
    <section
      className="bg-surface-subtle py-[var(--space-section)]"
      aria-labelledby="testimonials-title"
    >
      <div className="container">
        <SectionTitle>
          <Subtitle>Consent-backed perspective</Subtitle>
          <Title id="testimonials-title">
            {heading || "Reviewed collaboration feedback"}
          </Title>
          <Description>
            Only verified statements with active public-site consent are shown.
          </Description>
        </SectionTitle>
        {testimonials.length ? (
          <ul className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <li
                key={testimonial.slug}
                className="border-border bg-card rounded-xl border p-7"
              >
                <Quote className="text-primary size-7" aria-hidden />
                <blockquote className="mt-5 text-lg leading-8 font-semibold">
                  “{testimonial.quote}”
                </blockquote>
                <div className="mt-6 flex items-center gap-3">
                  {testimonial.avatar && (
                    <div className="relative size-11 overflow-hidden rounded-full">
                      <OptimizedMedia
                        src={testimonial.avatar.url}
                        alt={testimonial.avatar.alt_text || ""}
                        fallback="profile"
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <p className="text-sm">
                    <strong className="block">{testimonial.person_name}</strong>
                    <span className="text-muted-foreground">
                      {[testimonial.person_role, testimonial.organization]
                        .filter(Boolean)
                        .join(" · ") ||
                        testimonial.relationship.replaceAll("_", " ")}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-border bg-card mx-auto max-w-5xl rounded-[var(--radius-xl-token)] border p-8 shadow-[var(--shadow-xs)]">
            <p className="type-label text-primary">
              {unavailable
                ? "Feedback reader unavailable"
                : "No public testimonials yet"}
            </p>
            <h3 className="mt-4 text-2xl leading-tight font-black">
              Trust is represented by review gates until consent-backed quotes
              exist.
            </h3>
            <p className="text-muted-foreground mt-4 max-w-3xl text-sm leading-7">
              Unverified quotes, private client names, and informal praise stay
              out of the public site. The stronger launch proof is the visible
              system: typed content, capability-scoped publishing, managed-media
              provenance, accessibility boundaries, and safe fallback states.
            </p>
            <ul className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                "Verified records only",
                "Consent before attribution",
                "No placeholder client proof",
              ].map((item) => (
                <li
                  key={item}
                  className="border-border text-muted-foreground rounded-xl border p-4 text-sm font-semibold"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
