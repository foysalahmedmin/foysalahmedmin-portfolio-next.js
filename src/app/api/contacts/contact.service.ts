import AppError from '@/builder/app-error';
import { ENV } from '@/config';
import connectDB from '@/lib/db';
import { sendEmail } from '@/utils/send-email';
import httpStatus from 'http-status';
import * as ContactRepository from './contact.repository';

export const getContacts = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ContactRepository.findPaginated(queryParams);
};

export const getContactById = async (id: string) => {
  await connectDB();

  const contact = await ContactRepository.findByIdLean(id);
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found');
  }

  return contact;
};

export const createContact = async (payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) => {
  await connectDB();

  const contact = await ContactRepository.create(payload);

  const adminEmail = ENV.auth_user_email;
  const emailSubject = `New Contact Form Submission: ${payload.subject}`;
  const emailText = `You have received a new contact form submission.\n\nName: ${payload.name}\nEmail: ${payload.email}\nSubject: ${payload.subject}\nMessage: ${payload.message}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Contact Form Submission</h2>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Subject:</strong> ${payload.subject}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${payload.message}</p>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: adminEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });
  } catch (error) {
    console.error('Failed to send contact notification email:', error);
  }

  return contact;
};

export const updateContactById = async (
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    subject: string;
    message: string;
  }>,
) => {
  await connectDB();

  const contact = await ContactRepository.findById(id);
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found');
  }

  Object.assign(contact, payload);
  await contact.save();

  return contact;
};

export const updateContacts = async (
  ids: string[],
  payload: Record<string, unknown>,
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const contacts = await ContactRepository.findManyByIds(ids);
  const foundIds = contacts.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ContactRepository.updateMany(foundIds, payload);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteContactById = async (id: string) => {
  await connectDB();

  const contact = await ContactRepository.findById(id);
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found');
  }

  await contact.softDelete();
  return null;
};

export const deleteContactPermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const contact = await ContactRepository.findByIdWithDeleted(id);
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found');
  }

  await ContactRepository.hardDeleteById(id);
};

export const deleteContacts = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const contacts = await ContactRepository.findManyByIds(ids);
  const foundIds = contacts.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ContactRepository.softDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteContactsPermanent = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const contacts = await ContactRepository.findManyByIds(ids);
  const foundIds = contacts.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ContactRepository.hardDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreContactById = async (id: string) => {
  await connectDB();

  const contact = await ContactRepository.restoreById(id);
  if (!contact) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Contact not found or not deleted',
    );
  }

  return contact;
};

export const restoreContacts = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const result = await ContactRepository.restoreMany(ids);

  const restored = await ContactRepository.findManyByIds(ids);
  const restoredIds = restored.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
