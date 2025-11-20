import connectDB from '@/lib/db';
import Contact from './contact.model';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import httpStatus from 'http-status';
import { TContactDocument } from './contact.type';
import { sendEmail } from '@/utils/sendEmail';
import { ENV } from '@/config';

export const getContacts = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TContactDocument>(
    Contact.find(),
    queryParams,
  );

  const result = await query
    .search(['name', 'email', 'subject', 'message'])
    .filter()
    .sort(['created_at', 'name', 'email'])
    .paginate()
    .fields()
    .execute();

  return result;
};

export const getContactById = async (id: string) => {
  await connectDB();

  const contact = await Contact.findById(id).lean();

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

  const contact = await Contact.create(payload);

  // Send email notification to admin
  const adminEmail = ENV.authUserEmail;
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
    // Log error but don't fail the contact creation
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

  const contact = await Contact.findById(id);

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found');
  }

  Object.assign(contact, payload);
  await contact.save();

  return contact;
};

export const updateContacts = async (
  ids: string[],
  payload: Partial<{}>,
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const contacts = await Contact.find({ _id: { $in: ids } }).lean();
  const foundIds = contacts.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await Contact.updateMany(
    { _id: { $in: foundIds } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteContactById = async (id: string) => {
  await connectDB();

  const contact = await Contact.findById(id);

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found');
  }

  await contact.softDelete();

  return null;
};

export const deleteContactPermanentById = async (id: string): Promise<void> => {
  await connectDB();
  const contact = await Contact.findById(id).setOptions({ bypassDeleted: true });
  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found');
  }

  await Contact.findByIdAndDelete(id);
};

export const deleteContacts = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const contacts = await Contact.find({ _id: { $in: ids } }).lean();
  const foundIds = contacts.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await Contact.updateMany(
    { _id: { $in: foundIds } },
    { is_deleted: true },
  );

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteContactsPermanent = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const contacts = await Contact.find({ _id: { $in: ids } }).lean();
  const foundIds = contacts.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await Contact.deleteMany({ _id: { $in: foundIds } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreContactById = async (id: string) => {
  await connectDB();
  const contact = await Contact.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, 'Contact not found or not deleted');
  }

  return contact;
};

export const restoreContacts = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const result = await Contact.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredContacts = await Contact.find({ _id: { $in: ids } }).lean();
  const restoredIds = restoredContacts.map((contact) => contact._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

