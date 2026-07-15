import AppQuery from '@/builder/app-query';
import File from './file.model';
import type { TFile, TFileDocument, TFileReferenceModel } from './file.type';

export const create = async (data: Partial<TFile>): Promise<TFile> => {
  const result = await File.create(data);
  return result.toObject();
};

export const createMany = async (data: Partial<TFile>[]): Promise<TFile[]> => {
  const result = await File.insertMany(data);
  return result.map((item) => item.toObject());
};

export const findById = async (id: string): Promise<TFileDocument | null> => {
  return await File.findById(id).populate([
    { path: 'author', select: '_id name email image' },
  ]);
};

export const findByIdLean = async (id: string): Promise<TFile | null> => {
  return await File.findById(id).lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TFile | null> => {
  return await File.findById(id).setOptions({ bypassDeleted: true }).lean();
};

export const findDeletedById = async (id: string): Promise<TFile | null> => {
  return await File.findOne({ _id: id, is_deleted: true })
    .setOptions({ bypassDeleted: true })
    .lean();
};

export const findManyByIds = async (ids: string[]): Promise<TFile[]> => {
  return await File.find({ _id: { $in: ids } }).lean();
};

export const findManyDeletedByIds = async (
  ids: string[],
): Promise<TFile[]> => {
  return await File.find({
    _id: { $in: ids },
    is_deleted: true,
  })
    .setOptions({ bypassDeleted: true })
    .lean();
};

export const findPaginated = async (
  query: Record<string, unknown>,
  filterOverride: Record<string, unknown> = {},
) => {
  const fileQuery = new AppQuery<TFile>(
    File.find({ ...filterOverride }).populate([
      { path: 'author', select: '_id name email image' },
    ]),
    query,
  );

  return await fileQuery
    .search(['filename', 'originalname', 'name', 'description'])
    .filter(['status', 'provider', 'category', 'author', 'metadata.file_type'])
    .sort(['name', 'filename', 'size', 'status', 'provider', 'created_at'])
    .paginate()
    .fields(['filename', 'originalname', 'name', 'url', 'mimetype', 'size', 'author', 'provider', 'category', 'description', 'caption', 'status', 'metadata', 'references', 'created_at', 'updated_at'])
    .tap((q) => q.lean())
    .execute([
      { key: 'active', filter: { status: 'active' } },
      { key: 'inactive', filter: { status: 'inactive' } },
      { key: 'archived', filter: { status: 'archived' } },
      { key: 'local', filter: { provider: 'local' } },
      { key: 'gcs', filter: { provider: 'gcs' } },
      { key: 'cloudinary', filter: { provider: 'cloudinary' } },
    ]);
};

export const updateById = async (
  id: string,
  payload: Partial<TFile>,
): Promise<TFileDocument | null> => {
  return await File.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const updateManyByIds = async (
  ids: string[],
  payload: Partial<TFile>,
): Promise<{ modifiedCount: number }> => {
  return await File.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const restoreById = async (
  id: string,
): Promise<TFileDocument | null> => {
  return await File.findOneAndUpdate(
    { _id: id, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );
};

export const restoreManyByIds = async (
  ids: string[],
): Promise<{ modifiedCount: number }> => {
  return await File.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );
};

export const softDeleteByIdIfUnreferenced = async (
  id: string,
): Promise<boolean> => {
  const result = await File.updateOne(
    {
      _id: id,
      is_deleted: { $ne: true },
      'references.0': { $exists: false },
    },
    { $set: { is_deleted: true } },
  );
  return result.modifiedCount === 1;
};

export const softDeleteManyByIds = async (
  ids: string[],
): Promise<{ modifiedCount: number }> => {
  return await File.updateMany(
    {
      _id: { $in: ids },
      is_deleted: { $ne: true },
      'references.0': { $exists: false },
    },
    { $set: { is_deleted: true } },
  );
};

export const hardDeleteById = async (id: string): Promise<void> => {
  await File.findByIdAndDelete(id).setOptions({ bypassDeleted: true });
};

export const hardDeleteManyByIds = async (ids: string[]): Promise<void> => {
  await File.deleteMany({
    _id: { $in: ids },
    is_deleted: true,
  }).setOptions({ bypassDeleted: true });
};

export const attachReference = async (
  fileId: string,
  ref: { model: TFileReferenceModel; entity: string; field: string },
): Promise<boolean> => {
  const result = await File.updateOne(
    {
      _id: fileId,
      is_deleted: { $ne: true },
      references: {
        $not: {
          $elemMatch: {
            model: ref.model,
            entity: ref.entity,
            field: ref.field,
          },
        },
      },
    },
    {
      $push: {
        references: {
          model: ref.model,
          entity: ref.entity,
          field: ref.field,
          attached_at: new Date(),
        },
      },
    },
  );

  if (result.modifiedCount === 1) return true;

  const alreadyAttached = await File.exists({
    _id: fileId,
    is_deleted: { $ne: true },
    references: {
      $elemMatch: {
        model: ref.model,
        entity: ref.entity,
        field: ref.field,
      },
    },
  });
  return Boolean(alreadyAttached);
};

export const attachReferences = async (
  fileIds: string[],
  ref: { model: TFileReferenceModel; entity: string; field: string },
): Promise<string[]> => {
  if (!fileIds.length) return [];
  const results = await Promise.all(
    fileIds.map(async (id) => ({ id, attached: await attachReference(id, ref) })),
  );
  return results.filter(({ attached }) => !attached).map(({ id }) => id);
};

export const detachReference = async (
  fileId: string,
  ref: { model: TFileReferenceModel; entity: string; field?: string },
): Promise<void> => {
  await File.updateOne(
    { _id: fileId },
    {
      $pull: {
        references: {
          model: ref.model,
          entity: ref.entity,
          ...(ref.field && { field: ref.field }),
        },
      },
    },
  );
};

export const detachReferences = async (
  fileIds: string[],
  ref: { model: TFileReferenceModel; entity: string; field?: string },
): Promise<void> => {
  if (!fileIds.length) return;
  await Promise.all(fileIds.map((id) => detachReference(id, ref)));
};

export const detachAllForEntity = async (
  ref: { model: TFileReferenceModel; entity: string },
): Promise<void> => {
  await File.updateMany(
    { 'references.entity': ref.entity, 'references.model': ref.model },
    { $pull: { references: { model: ref.model, entity: ref.entity } } },
  );
};

export const findIdsForEntity = async (
  ref: { model: TFileReferenceModel; entity: string; field?: string },
): Promise<string[]> => {
  const docs = await File.find({
    references: {
      $elemMatch: {
        model: ref.model,
        entity: ref.entity,
        ...(ref.field && { field: ref.field }),
      },
    },
  })
    .select('_id')
    .lean();

  return docs.map((d) => (d._id as { toString(): string }).toString());
};
