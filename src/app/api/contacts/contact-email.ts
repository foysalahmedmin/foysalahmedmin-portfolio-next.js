import type { ContactVisibleFields } from "./contact-public.contract";
import { escapeHtml } from "@/lib/security/escape-html";

export const escapeEmailHtml = escapeHtml;

export const normalizeEmailSubjectFragment = (value: string): string =>
  value
    .replace(/[\r\n\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

export const buildContactNotificationEmail = (
  contact: ContactVisibleFields
): {
  subject: string;
  text: string;
  html: string;
  replyTo: string;
} => {
  const subjectFragment = normalizeEmailSubjectFragment(contact.subject);
  const subject = `New portfolio inquiry: ${subjectFragment || "Contact form"}`;
  const text = [
    "A new portfolio inquiry has been stored.",
    "",
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Subject: ${contact.subject}`,
    "Message:",
    contact.message,
  ].join("\n");
  const html = [
    '<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">',
    "<h2>New portfolio inquiry</h2>",
    `<p><strong>Name:</strong> ${escapeEmailHtml(contact.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeEmailHtml(contact.email)}</p>`,
    `<p><strong>Subject:</strong> ${escapeEmailHtml(contact.subject)}</p>`,
    "<p><strong>Message:</strong></p>",
    `<p style="white-space:pre-wrap">${escapeEmailHtml(contact.message)}</p>`,
    "</div>",
  ].join("");

  return { subject, text, html, replyTo: contact.email };
};
