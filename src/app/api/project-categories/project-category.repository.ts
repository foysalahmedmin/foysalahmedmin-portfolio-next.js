import AppQuery from '@/builder/app-query';
import ProjectCategory from './project-category.model';
import type {
  TProjectCategory,
  TProjectCategoryDocument,
} from './project-category.type';

const POPULATE_PARENT = { path: 'parent', select: '_id name' };

export const create = async (
  data: Partial<TProjectCategory>,
): Promise<TProjectCategoryDocument> => {
  return await ProjectCategory.create(data);
};

export const findById = async (
  id: string,
): Promise<TProjectCategoryDocument | null> => {
  return await ProjectCategory.findById(id);
};

export const findByIdPopulated = async (id: string) => {
  return await ProjectCategory.findById(id).populate(POPULATE_PARENT).lean();
};

export const findByIdWithDeleted = async (
  id: string,
): Promise<TProjectCategoryDocument | null> => {
  return await ProjectCategory.findById(id).setOptions({ bypassDeleted: true });
};

export const findBySlug = async (
  slug: string,
): Promise<TProjectCategoryDocument | null> => {
  return await ProjectCategory.findOne({ slug });
};

export const findBySlugPopulated = async (slug: string) => {
  return await ProjectCategory.findOne({ slug })
    .populate(POPULATE_PARENT)
    .lean();
};

export const findBySlugWithDeleted = async (
  slug: string,
): Promise<TProjectCategoryDocument | null> => {
  return await ProjectCategory.findOne({ slug }).setOptions({
    bypassDeleted: true,
  });
};

export const findManyBySlugs = async (slugs: string[]) => {
  return await ProjectCategory.find({ slug: { $in: slugs } }).lean();
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const query = new AppQuery<TProjectCategoryDocument>(
    ProjectCategory.find(),
    queryParams,
  );

  return await query
    .search(['name', 'slug', 'description'])
    .filter(['status', 'parent'])
    .sort(['sequence', 'name'])
    .paginate()
    .fields()
    .execute();
};

export const updateManyBySlugs = async (
  slugs: string[],
  payload: Partial<TProjectCategory>,
) => {
  return await ProjectCategory.updateMany(
    { slug: { $in: slugs } },
    { ...payload },
  );
};

export const softDeleteManyBySlugs = async (slugs: string[]) => {
  await ProjectCategory.updateMany(
    { slug: { $in: slugs } },
    { is_deleted: true },
  );
};

export const restoreBySlug = async (slug: string) => {
  return await ProjectCategory.findOneAndUpdate(
    { slug, is_deleted: true },
    { is_deleted: false },
    { new: true },
  );
};

export const restoreById = async (id: string) => {
  return await ProjectCategory.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );
};

export const restoreManyBySlugs = async (slugs: string[]) => {
  return await ProjectCategory.updateMany(
    { slug: { $in: slugs }, is_deleted: true },
    { is_deleted: false },
  );
};

export const hardDeleteById = async (id: string) => {
  await ProjectCategory.findByIdAndDelete(id);
};

export const hardDeleteManyBySlugs = async (slugs: string[]) => {
  await ProjectCategory.deleteMany({ slug: { $in: slugs } }).setOptions({
    bypassDeleted: true,
  });
};
