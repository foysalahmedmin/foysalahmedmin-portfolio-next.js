import AppQuery from '@/builder/app-query';
import Contact from './contact.model';
import type { TContact, TContactDocument } from './contact.type';

export const create = async (
  data: Partial<TContact>,
): Promise<TContactDocument> => {
  return await Contact.create(data);
};

export const findById = async (
  id: string,
): Promise<TContactDocument | null> => {
  return await Contact.findById(id);
};

export const findByIdLean = async (id: string): Promise<TContact | null> => {
  return await Contact.findById(id).lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TContactDocument | null> => {
  return await Contact.findById(id).setOptions({ bypassDeleted: true });
};

export const findManyByIds = async (ids: string[]) => {
  return await Contact.find({ _id: { $in: ids } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const query = new AppQuery<TContactDocument>(Contact.find(), queryParams);

  return await query
    .search(['name', 'email', 'subject', 'message'])
    .filter()
    .sort(['created_at', 'name', 'email'])
    .paginate()
    .fields()
    .execute();
};

export const updateMany = async (
  ids: string[],
  payload: Partial<TContact>,
) => {
  return await Contact.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const softDeleteMany = async (ids: string[]) => {
  await Contact.updateMany({ _id: { $in: ids } }, { is_deleted: true });
};

export const restoreById = async (id: string) => {
  return await Contact.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );
};

export const restoreMany = async (ids: string[]) => {
  return await Contact.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );
};

export const hardDeleteById = async (id: string) => {
  await Contact.findByIdAndDelete(id);
};

export const hardDeleteMany = async (ids: string[]) => {
  await Contact.deleteMany({ _id: { $in: ids } }).setOptions({
    bypassDeleted: true,
  });
};
