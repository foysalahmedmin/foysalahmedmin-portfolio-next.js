import { ENV } from '@/config';
import nodemailer from 'nodemailer';

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ENV.auth_user_email,
      pass: ENV.auth_user_email_password,
    },
  });

  await transporter.sendMail({
    from: ENV.auth_user_email,
    to,
    subject,
    text,
    html,
  });
};
