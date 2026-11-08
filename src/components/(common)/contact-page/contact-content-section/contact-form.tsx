"use client";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import type {
  ContactPublicError,
  ContactPublicSuccess,
  ContactVisibleFields,
} from "@/app/api/contacts/contact-public.contract";
import { AlertTriangle, Check, Send, X } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import {
  subjectForGroup,
  TOPIC_GROUPS,
  type ContactTopic,
  type TopicGroup,
} from "../topic";

// The validation schema pulls in zod (about 49 KB gzip). It loads on the first field focus, not with the
// page, so every public route's initial JavaScript stays inside budget (ADR 0009). Submit awaits it.
const importContract = () =>
  import("@/app/api/contacts/contact-public.contract");
let contractModule: ReturnType<typeof importContract> | undefined;
const loadContract = () => (contractModule ??= importContract());

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

type Props = Readonly<{
  topic: ContactTopic | null;
  startLabels: readonly string[];
  responsePromise?: string | undefined;
}>;

/**
 * The contact form. Validation, honeypot, fill-time check, idempotency key, request body and receipt
 * handling are unchanged; the topic only pre-fills the subject line (a line the visitor can rewrite).
 */
const ContactForm = ({ topic, startLabels, responsePromise }: Props) => {
  const [formData, setFormData] = useState<ContactVisibleFields>({
    ...EMPTY_FORM,
    subject: topic?.subject ?? "",
  });
  const [group, setGroup] = useState<TopicGroup | null>(topic?.group ?? null);
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

  const chooseGroup = (next: TopicGroup) => {
    setGroup(next);
    // Rewrite the subject only while it is still the line this page wrote, never over the visitor's own words.
    const written = group
      ? subjectForGroup(group, topic)
      : (topic?.subject ?? "");
    if (formData.subject === written) {
      updateField("subject", subjectForGroup(next, topic));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const { contactVisibleFieldsSchema } = await loadContract();
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

  const loading = status === "loading";

  return (
    <div className="cv-panel glass-2">
      <div className="cv-panel__head">
        <h2 id="cv-form-heading" className="t-h4">
          Send a message
        </h2>
        <p className="cv-panel__lede">
          Share the context, goals, and constraints.
          {responsePromise
            ? ` ${responsePromise}.`
            : " A response estimate will be provided after review."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        onFocusCapture={() => void loadContract()}
        className="cv-form"
        noValidate
        aria-busy={loading}
      >
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="contact-company-website">Company website</label>
          <input
            id="contact-company-website"
            name="company_website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            disabled={loading}
            value={companyWebsite}
            onChange={(event) => setCompanyWebsite(event.target.value)}
          />
        </div>

        <fieldset className="cv-topic">
          <legend className="t-eyebrow">Topic</legend>
          <div className="cv-chips">
            {TOPIC_GROUPS.map((item) => (
              <label key={item.key} className="cv-chip">
                <input
                  type="radio"
                  name="contact-topic"
                  value={item.key}
                  checked={group === item.key}
                  disabled={loading}
                  onChange={() => chooseGroup(item.key)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          {topic ? (
            <Link
              href="/contact"
              className="cv-topic-chip"
              aria-label={`Remove topic: ${topic.label}`}
            >
              <span className="cv-topic-chip__text">{topic.label}</span>
              <X className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}
          {startLabels.length > 0 ? (
            <p className="cv-start t-eyebrow">
              From the finder: {startLabels.join(" · ")}
            </p>
          ) : null}
        </fieldset>

        <div className="cv-row">
          <div className="cv-field">
            <label htmlFor="contact-name" className="cv-label t-eyebrow">
              Full Name
            </label>
            <div className="cv-control">
              <input
                id="contact-name"
                name="name"
                required
                disabled={loading}
                type="text"
                autoComplete="name"
                maxLength={100}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={
                  fieldErrors.name ? "contact-name-error" : undefined
                }
                className="cv-input"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
              />
            </div>
            {fieldErrors.name && (
              <FieldError id="contact-name-error">
                {fieldErrors.name}
              </FieldError>
            )}
          </div>
          <div className="cv-field">
            <label htmlFor="contact-email" className="cv-label t-eyebrow">
              Email Address
            </label>
            <div className="cv-control">
              <input
                id="contact-email"
                name="email"
                required
                disabled={loading}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? "contact-email-error" : undefined
                }
                className="cv-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            {fieldErrors.email && (
              <FieldError id="contact-email-error">
                {fieldErrors.email}
              </FieldError>
            )}
          </div>
        </div>

        <div className="cv-field">
          <label htmlFor="contact-subject" className="cv-label t-eyebrow">
            Subject
          </label>
          <div className="cv-control">
            <input
              id="contact-subject"
              name="subject"
              required
              disabled={loading}
              type="text"
              maxLength={200}
              aria-invalid={Boolean(fieldErrors.subject)}
              aria-describedby={
                fieldErrors.subject ? "contact-subject-error" : undefined
              }
              className="cv-input"
              placeholder="What would you like to build or improve?"
              value={formData.subject}
              onChange={(e) => updateField("subject", e.target.value)}
            />
          </div>
          {fieldErrors.subject && (
            <FieldError id="contact-subject-error">
              {fieldErrors.subject}
            </FieldError>
          )}
        </div>

        <div className="cv-field">
          <label htmlFor="contact-message" className="cv-label t-eyebrow">
            Message
          </label>
          <div className="cv-control">
            <textarea
              id="contact-message"
              name="message"
              required
              disabled={loading}
              rows={6}
              maxLength={2000}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={
                fieldErrors.message
                  ? "contact-message-description contact-message-error"
                  : "contact-message-description"
              }
              className="cv-input"
              placeholder="Describe the outcome, current constraints, timeline, and relevant context."
              value={formData.message}
              onChange={(e) => updateField("message", e.target.value)}
            />
          </div>
          <p id="contact-message-description" className="cv-hint">
            Please avoid passwords, access keys, or other sensitive data.
          </p>
          {fieldErrors.message && (
            <FieldError id="contact-message-error">
              {fieldErrors.message}
            </FieldError>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={loading}
          aria-describedby="contact-form-status"
        >
          {loading
            ? "Sending..."
            : status === "error" || status === "timeout"
              ? "Retry Message"
              : "Send Message"}
          <Send className="ml-2 size-4" />
        </Button>

        <div
          id="contact-form-status"
          role={status === "error" || status === "timeout" ? "alert" : "status"}
          aria-live={
            status === "error" || status === "timeout" ? "assertive" : "polite"
          }
          aria-atomic="true"
          className={
            status === "idle"
              ? "sr-only"
              : status === "success" || status === "duplicate"
                ? "border-foreground flex items-start gap-3 rounded-lg border border-solid p-4 text-sm font-medium"
                : loading
                  ? "text-muted-foreground text-sm font-medium"
                  : "border-foreground flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm font-semibold"
          }
        >
          {/* State is a glyph plus a label, never a colour (docs plan 3.6) */}
          {status === "success" || status === "duplicate" ? (
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : status !== "idle" && !loading ? (
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : null}
          <span>
            {status !== "idle" &&
            !loading &&
            status !== "success" &&
            status !== "duplicate" ? (
              <strong className="font-bold">Error: </strong>
            ) : null}
            {statusMessage}
            {receipt && (status === "success" || status === "duplicate")
              ? ` Reference: ${receipt}.`
              : ""}
          </span>
        </div>

        <p className="cv-hint">
          Your details are used only to reply to this inquiry and are removed or
          anonymized according to the contact retention policy.{" "}
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
  );
};

export default ContactForm;
