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
      user: ENV.authUserEmail,
      pass: ENV.authUserEmailPassword,
    },
  });

  await transporter.sendMail({
    from: ENV.authUserEmail,
    to,
    subject,
    text,
    html,
  });
};
