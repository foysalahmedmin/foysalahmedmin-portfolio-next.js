import { ENV } from "@/config";
import nodemailer from "nodemailer";
import { z } from "zod";

const mailboxSchema = z.string().trim().email().max(254);

const assertSafeHeader = (value: string, label: string): string => {
  if (!value || /[\r\n\u0000]/.test(value) || value.length > 300) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  replyTo,
  messageId,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  messageId?: string;
}) => {
  const from = mailboxSchema.parse(ENV.auth_user_email);
  const safeTo = mailboxSchema.parse(to);
  const safeReplyTo = replyTo ? mailboxSchema.parse(replyTo) : undefined;
  const safeSubject = assertSafeHeader(subject, "email subject");
  const safeMessageId = messageId
    ? assertSafeHeader(messageId, "message ID")
    : undefined;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: ENV.auth_user_email,
      pass: ENV.auth_user_email_password,
    },
  });

  await transporter.sendMail({
    from,
    to: safeTo,
    replyTo: safeReplyTo,
    subject: safeSubject,
    messageId: safeMessageId,
    text,
    html,
  });
};
