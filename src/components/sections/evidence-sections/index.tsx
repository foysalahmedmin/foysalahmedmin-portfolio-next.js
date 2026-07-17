import type { TPublicCredentialDto } from "@/app/api/credentials/credential.type";
import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import type { TPublicTestimonialDto } from "@/app/api/testimonials/testimonial.type";
import type { TPublicTimelineEntryDto } from "@/app/api/timeline/timeline-entry.type";
import TrustedRichText from "@/components/content/trusted-rich-text";
import OptimizedMedia from "@/components/ui/optimized-media";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import { cn } from "@/lib/utils";
import {
  Award,
  CalendarRange,
  CheckCircle2,
  HelpCircle,
  Quote,
  ShieldCheck,
} from "lucide-react";

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
  <div className="border-border bg-surface-subtle rounded-2xl border p-8 text-center">
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
    className="py-[var(--space-section)]"
    aria-labelledby="timeline-title"
  >
    <div className="container">
      <SectionTitle>
        <Subtitle>Verified chronology</Subtitle>
        <Title id="timeline-title">
          {heading || "Experience and education"}
        </Title>
        <Description>
          Only reviewed timeline entries are public; private verification
          references never leave the admin boundary.
        </Description>
      </SectionTitle>
      {entries.length ? (
        <ol className="relative mx-auto max-w-5xl space-y-6 before:absolute before:top-3 before:bottom-3 before:left-[1.18rem] before:w-px before:bg-[var(--border)] md:before:left-1/2">
          {entries.map((entry, index) => (
            <li
              key={entry.slug}
              className={`relative grid gap-5 md:grid-cols-2 ${
                index % 2 ? "md:[&>article]:col-start-2" : ""
              }`}
            >
              <span className="bg-primary ring-background absolute top-7 left-3 z-10 size-4 rounded-full ring-4 md:left-1/2 md:-translate-x-1/2" />
              <article className="border-border bg-card ml-12 rounded-2xl border p-6 shadow-sm md:ml-0 md:odd:mr-10 md:even:ml-10">
                <div className="text-primary flex items-center gap-2 text-xs font-black tracking-wide uppercase">
                  <CalendarRange className="size-4" aria-hidden />
                  {formatMonth(entry.started_at)} –{" "}
                  {entry.is_current
                    ? "Present"
                    : entry.ended_at
                      ? formatMonth(entry.ended_at)
                      : "Date not published"}
                </div>
                <h3 className="mt-4 text-xl font-black">{entry.position}</h3>
                <p className="text-muted-foreground mt-1 font-semibold">
                  {entry.organization}
                  {entry.location ? ` · ${entry.location}` : ""}
                </p>
                {entry.highlights.length > 0 && (
                  <ul className="text-muted-foreground mt-5 space-y-2 text-sm leading-6">
                    {entry.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-2">
                        <CheckCircle2
                          className="text-primary mt-1 size-4 shrink-0"
                          aria-hidden
                        />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}
                {entry.technologies.length > 0 && (
                  <p className="text-muted-foreground mt-5 text-xs">
                    {entry.technologies.slice(0, 8).join(" · ")}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyEvidence title="Timeline records" unavailable={unavailable} />
      )}
    </div>
  </section>
);

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
    className="bg-surface-subtle py-[var(--space-section)]"
    aria-labelledby="credentials-title"
  >
    <div className="container">
      <SectionTitle>
        <Subtitle>Reviewed credentials</Subtitle>
        <Title id="credentials-title">
          {heading || "Credentials and continued learning"}
        </Title>
        <Description>
          Issuer and date metadata is shown only for verified public records.
        </Description>
      </SectionTitle>
      {credentials.length ? (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {credentials.map((credential) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
                    <Award className="size-5" aria-hidden />
                  </span>
                  <span className="bg-success/10 text-success rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase">
                    Verified
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black">{credential.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  {credential.issuer} · {formatMonth(credential.issued_at)}
                </p>
                {credential.summary && (
                  <p className="text-muted-foreground mt-4 text-sm leading-6">
                    {credential.summary}
                  </p>
                )}
              </>
            );
            return (
              <li key={credential.slug}>
                {credential.credential_url &&
                isAllowedPublicProjectUrl(credential.credential_url) ? (
                  <a
                    href={credential.credential_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border bg-card hover:border-primary focus-visible:ring-primary block h-full rounded-2xl border p-6 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {content}
                    <span className="text-primary mt-5 inline-block text-sm font-bold">
                      Verify with issuer ↗
                    </span>
                  </a>
                ) : (
                  <article className="border-border bg-card h-full rounded-2xl border p-6">
                    {content}
                  </article>
                )}
              </li>
            );
          })}
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
  layout = "accordion",
}: {
  faqs: readonly TPublicFAQDto[];
  unavailable?: boolean;
  heading?: string;
  layout?: string;
}) => {
  const isOpenList = layout === "list";

  return (
    <section
      className={cn(
        "py-[var(--space-section)]",
        isOpenList && "bg-surface-subtle"
      )}
      aria-labelledby="faq-title"
    >
      <div
        className={cn(
          "container",
          isOpenList
            ? "grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"
            : "max-w-5xl"
        )}
      >
        <div className={cn(isOpenList && "lg:sticky lg:top-28")}>
          <SectionTitle
            variant={isOpenList ? "start" : "center"}
            className={cn(isOpenList && "mb-8")}
          >
            <Subtitle>Useful before a conversation</Subtitle>
            <Title id="faq-title">
              {heading || "Frequently asked questions"}
            </Title>
            <Description className={cn(isOpenList && "mx-0")}>
              Clear expectations make the first call sharper: scope, delivery,
              security, communication, and proof all get answered before a
              project starts.
            </Description>
          </SectionTitle>

          {isOpenList && (
            <div className="border-border bg-background rounded-[var(--radius-xl-token)] border p-5 shadow-[var(--shadow-xs)]">
              <div className="flex items-start gap-3">
                <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-2xl">
                  <HelpCircle className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-black">No hidden sales theatre</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    These answers come from published FAQ records, so the
                    homepage can stay useful without hardcoded promises.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {faqs.length ? (
          isOpenList ? (
            <ol className="space-y-4">
              {faqs.map((faq, index) => (
                <li key={faq.slug}>
                  <article className="border-border bg-card rounded-[var(--radius-xl-token)] border p-6 shadow-[var(--shadow-xs)]">
                    <div className="text-primary flex items-center gap-2 text-xs font-black tracking-wide uppercase">
                      <ShieldCheck className="size-4" aria-hidden />
                      Answer {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-4 text-xl leading-tight font-black">
                      {faq.question}
                    </h3>
                    <TrustedRichText
                      html={faq.answer}
                      className="editorial text-muted-foreground mt-4 max-w-none whitespace-pre-line"
                    />
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.slug}
                  className="border-border bg-card group rounded-2xl border p-1"
                >
                  <summary className="focus-visible:ring-primary flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 rounded-xl px-5 py-3 font-bold focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <span
                      className="text-primary text-xl transition-transform group-open:rotate-45 motion-reduce:transition-none"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <TrustedRichText
                    html={faq.answer}
                    className="editorial text-muted-foreground max-w-none px-5 pt-2 pb-5 whitespace-pre-line"
                  />
                </details>
              ))}
            </div>
          )
        ) : (
          <EmptyEvidence title="FAQs" unavailable={unavailable} />
        )}
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
                className="border-border bg-card rounded-2xl border p-7"
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
                  className="border-border text-muted-foreground rounded-2xl border p-4 text-sm font-semibold"
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
