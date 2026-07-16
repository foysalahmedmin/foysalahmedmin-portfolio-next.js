"use client";

import { Button } from "@/components/ui/button";
import type { TPublicSiteDto } from "@/app/api/site/site.type";
import {
  contactVisibleFieldsSchema,
  type ContactPublicError,
  type ContactPublicSuccess,
  type ContactVisibleFields,
} from "@/app/api/contacts/contact-public.contract";
import {
  ClipboardCheck,
  Clock3,
  MapPin,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const EMPTY_FORM: ContactVisibleFields = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

type SubmissionStatus =
  | "idle"
  | "loading"
  | "success"
  | "duplicate"
  | "error"
  | "timeout";

type PublicResponse = ContactPublicSuccess | ContactPublicError;

const inquirySteps = [
  {
    icon: <MessageSquareText className="size-6" aria-hidden="true" />,
    label: "Share the context",
    value: "Describe the problem, desired outcome, timeline, and constraints.",
  },
  {
    icon: <ShieldCheck className="size-6" aria-hidden="true" />,
    label: "Protected intake",
    value:
      "Validation, abuse controls, deduplication, and bounded retention protect the workflow.",
  },
  {
    icon: <ClipboardCheck className="size-6" aria-hidden="true" />,
    label: "Keep your reference",
    value:
      "A successful stored submission returns a non-sensitive receipt for follow-up.",
  },
];

const ContactContentSection = ({ site }: { site?: TPublicSiteDto }) => {
  const contact: TPublicSiteDto["contact"] = site?.contact ?? {
    availability: "unknown",
    map_policy: "hidden",
  };
  const [formData, setFormData] = useState<ContactVisibleFields>(EMPTY_FORM);
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [receipt, setReceipt] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formStartedAt = useRef(Date.now());
  const idempotencyKey = useRef<string | null>(null);
  const contactSession = useRef<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const focusFirstError = (errors: Record<string, string>) => {
    const field = Object.keys(errors)[0];
    if (!field || field === "form") return;
    window.requestAnimationFrame(() => {
      document.getElementById(`contact-${field}`)?.focus();
    });
  };

  useEffect(() => {
    formStartedAt.current = Date.now();
    try {
      const stored = window.sessionStorage.getItem("contact-session-key");
      const value = stored || window.crypto.randomUUID();
      contactSession.current = value;
      if (!stored) window.sessionStorage.setItem("contact-session-key", value);
    } catch {
      contactSession.current = window.crypto.randomUUID();
    }

    return () => activeRequest.current?.abort();
  }, []);

  const updateField = (field: keyof ContactVisibleFields, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (status !== "loading") idempotencyKey.current = null;
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (status !== "idle" && status !== "loading") {
      setStatus("idle");
      setStatusMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const parsed = contactVisibleFieldsSchema.safeParse(formData);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      focusFirstError(errors);
      setStatus("error");
      setStatusMessage("Check the highlighted fields and try again.");
      return;
    }

    setStatus("loading");
    setStatusMessage("Sending your message…");
    setFieldErrors({});
    idempotencyKey.current ??= window.crypto.randomUUID();
    contactSession.current ??= window.crypto.randomUUID();
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey.current,
          "x-contact-session": contactSession.current,
        },
        body: JSON.stringify({
          ...parsed.data,
          company_website: companyWebsite,
          form_started_at: formStartedAt.current,
        }),
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = (await response
        .json()
        .catch(() => null)) as PublicResponse | null;

      if (!response.ok || !payload?.success) {
        const errorPayload = payload && !payload.success ? payload : null;
        if (errorPayload?.fields) {
          setFieldErrors(errorPayload.fields);
          focusFirstError(errorPayload.fields);
        }
        setStatus("error");
        setStatusMessage(
          errorPayload?.message ||
            "Your message could not be sent. Please try again."
        );
        return;
      }

      setStatus(payload.data.duplicate ? "duplicate" : "success");
      setStatusMessage(payload.message);
      setReceipt(payload.data.receipt);
      setFormData(EMPTY_FORM);
      setCompanyWebsite("");
      idempotencyKey.current = null;
      formStartedAt.current = Date.now();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("timeout");
        setStatusMessage(
          "The request timed out. Your submission key is preserved—retrying will not create a duplicate."
        );
      } else {
        setStatus("error");
        setStatusMessage(
          "You appear to be offline, or the service is unavailable. Please try again."
        );
      }
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  };

  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Contact Details */}
          <div className="space-y-12">
            {(contact.location ||
              contact.availability_label ||
              contact.response_promise) && (
              <div className="border-border bg-surface-raised rounded-3xl border p-7 shadow-[var(--shadow-xs)]">
                <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
                  Engagement context
                </p>
                <dl className="mt-5 space-y-4">
                  {contact.location && (
                    <div className="flex gap-3">
                      <MapPin
                        className="text-primary mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-sm font-bold">Location</dt>
                        <dd className="text-muted-foreground mt-1 text-sm">
                          {contact.location}
                        </dd>
                      </div>
                    </div>
                  )}
                  {contact.availability_label && (
                    <div className="flex gap-3">
                      <span
                        className="bg-success mt-1.5 size-3 shrink-0 rounded-full"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-sm font-bold">Availability</dt>
                        <dd className="text-muted-foreground mt-1 text-sm">
                          {contact.availability_label}
                        </dd>
                      </div>
                    </div>
                  )}
                  {contact.response_promise && (
                    <div className="flex gap-3">
                      <Clock3
                        className="text-primary mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="text-sm font-bold">Response window</dt>
                        <dd className="text-muted-foreground mt-1 text-sm">
                          {contact.response_promise}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>
            )}
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1">
              {inquirySteps.map((step, i) => (
                <div
                  key={step.label}
                  className="fade-left group border-border bg-card hover:border-primary/50 flex items-start gap-6 rounded-2xl border p-8 transition-[border-color,box-shadow] duration-300 hover:shadow-lg"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-14 items-center justify-center rounded-xl transition-colors">
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-primary text-sm font-bold tracking-widest uppercase">
                      {step.label}
                    </p>
                    <p className="text-muted-foreground mt-2 leading-relaxed">
                      {step.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="fade-right border-border bg-card rounded-3xl border p-8 shadow-sm lg:p-12">
            <div className="mb-10">
              <h3 className="text-2xl font-bold">Send a Message</h3>
              <p className="text-muted-foreground mt-2">
                Share the context, goals, and constraints.
                {contact.response_promise
                  ? ` ${contact.response_promise}.`
                  : " A response estimate will be provided after review."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="relative space-y-6"
              noValidate
              aria-busy={status === "loading"}
            >
              <div aria-hidden="true" className="sr-only">
                <label htmlFor="contact-company-website">Company website</label>
                <input
                  id="contact-company-website"
                  name="company_website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  disabled={status === "loading"}
                  value={companyWebsite}
                  onChange={(event) => setCompanyWebsite(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="contact-name"
                    className="text-sm font-bold tracking-tight uppercase"
                  >
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    required
                    disabled={status === "loading"}
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={
                      fieldErrors.name ? "contact-name-error" : undefined
                    }
                    className="border-border bg-background focus:border-primary w-full rounded-xl border px-4 py-3 transition-all focus:outline-none"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                  {fieldErrors.name && (
                    <p id="contact-name-error" className="text-sm text-red-600">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="contact-email"
                    className="text-sm font-bold tracking-tight uppercase"
                  >
                    Email Address
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    required
                    disabled={status === "loading"}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? "contact-email-error" : undefined
                    }
                    className="border-border bg-background focus:border-primary w-full rounded-xl border px-4 py-3 transition-all focus:outline-none"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                  {fieldErrors.email && (
                    <p
                      id="contact-email-error"
                      className="text-sm text-red-600"
                    >
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="contact-subject"
                  className="text-sm font-bold tracking-tight uppercase"
                >
                  Subject
                </label>
                <input
                  id="contact-subject"
                  name="subject"
                  required
                  disabled={status === "loading"}
                  type="text"
                  maxLength={200}
                  aria-invalid={Boolean(fieldErrors.subject)}
                  aria-describedby={
                    fieldErrors.subject ? "contact-subject-error" : undefined
                  }
                  className="border-border bg-background focus:border-primary w-full rounded-xl border px-4 py-3 transition-all focus:outline-none"
                  placeholder="What would you like to build or improve?"
                  value={formData.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                />
                {fieldErrors.subject && (
                  <p
                    id="contact-subject-error"
                    className="text-sm text-red-600"
                  >
                    {fieldErrors.subject}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="contact-message"
                  className="text-sm font-bold tracking-tight uppercase"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  disabled={status === "loading"}
                  rows={6}
                  maxLength={2000}
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={
                    fieldErrors.message
                      ? "contact-message-description contact-message-error"
                      : "contact-message-description"
                  }
                  className="border-border bg-background focus:border-primary w-full resize-none rounded-xl border px-4 py-3 transition-all focus:outline-none"
                  placeholder="Describe the outcome, current constraints, timeline, and relevant context."
                  value={formData.message}
                  onChange={(e) => updateField("message", e.target.value)}
                />
                <p
                  id="contact-message-description"
                  className="text-muted-foreground text-xs"
                >
                  Please avoid passwords, access keys, or other sensitive data.
                </p>
                {fieldErrors.message && (
                  <p
                    id="contact-message-error"
                    className="text-sm text-red-600"
                  >
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full px-12 font-bold tracking-widest uppercase sm:w-auto"
                disabled={status === "loading"}
                aria-describedby="contact-form-status"
              >
                {status === "loading"
                  ? "Sending..."
                  : status === "error" || status === "timeout"
                    ? "Retry Message"
                    : "Send Message"}
                <Send className="ml-2 size-4" />
              </Button>

              <div
                id="contact-form-status"
                role={
                  status === "error" || status === "timeout"
                    ? "alert"
                    : "status"
                }
                aria-live={
                  status === "error" || status === "timeout"
                    ? "assertive"
                    : "polite"
                }
                aria-atomic="true"
                className={
                  status === "idle"
                    ? "sr-only"
                    : status === "success" || status === "duplicate"
                      ? "border-success/30 bg-success/10 text-success mt-4 rounded-lg border p-4 text-sm font-medium"
                      : status === "loading"
                        ? "text-muted-foreground mt-4 text-sm font-medium"
                        : "border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-lg border p-4 text-sm font-medium"
                }
              >
                {statusMessage}
                {receipt && (status === "success" || status === "duplicate")
                  ? ` Reference: ${receipt}.`
                  : ""}
              </div>

              <p className="text-muted-foreground text-xs leading-relaxed">
                Your details are used only to reply to this inquiry and are
                removed or anonymized according to the contact retention policy.{" "}
                <a
                  href="/privacy"
                  className="text-foreground underline underline-offset-4"
                >
                  Read the privacy policy
                </a>
                .
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactContentSection;
