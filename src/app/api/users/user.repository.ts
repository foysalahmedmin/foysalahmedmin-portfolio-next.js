import AppQuery from "@/builder/app-query";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import type { ClientSession } from "mongoose";
import Article from "../articles/article.model";
import File from "../files/file.model";
import Project from "../projects/project.model";
import { Review } from "../reviews/review.model";
import { User } from "./user.model";
import type { TUser, TUserDocument } from "./user.type";

const FILE_SELECT = "_id url filename mimetype size provider metadata";

const toIdString = (value: unknown): string =>
  (value as { toString(): string }).toString();

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export type TUserPurgeDependency = {
  id: string;
  dependencies: Array<
    | "authored_articles"
    | "collaborating_articles"
    | "authored_projects"
    | "client_projects"
    | "collaborating_projects"
    | "reviews"
    | "files"
  >;
};

export const create = async (data: Partial<TUser>): Promise<TUserDocument> => {
  return await User.create(data);
};

export const findById = async (id: string): Promise<TUserDocument | null> => {
  return await User.findById(id);
};

export const findByIdLean = async (id: string) => {
  return await User.findById(id)
    .populate({ path: "image", select: FILE_SELECT })
    .lean();
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TUserDocument | null> => {
  return await setSoftDeleteScope(User.findById(id), "with_deleted");
};

export const findDeletedById = async (
  id: string
): Promise<TUserDocument | null> => {
  return await setSoftDeleteScope(User.findById(id), "only_deleted");
};

export const findByEmail = async (email: string) => {
  return await User.findOne({ email }).lean();
};

export const findManyByIds = async (ids: string[]) => {
  return await User.find({ _id: { $in: ids } }).lean();
};

export const findDeletedManyByIds = async (ids: string[]) => {
  return await setSoftDeleteScope(
    User.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();
};

export const findNotRestorableIds = async (
  users: Array<Pick<TUser, "email"> & { _id: unknown }>
): Promise<string[]> => {
  if (!users.length) return [];

  const emails = [...new Set(users.map(({ email }) => normalizeEmail(email)))];
  const activeUsers = await User.find({ email: { $in: emails } })
    .select("email")
    .lean();
  const activeEmails = new Set(
    activeUsers.map(({ email }) => normalizeEmail(email))
  );
  const candidateCounts = users.reduce((counts, { email }) => {
    const normalized = normalizeEmail(email);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

  return users
    .filter(({ email }) => {
      const normalized = normalizeEmail(email);
      return (
        activeEmails.has(normalized) ||
        (candidateCounts.get(normalized) ?? 0) > 1
      );
    })
    .map(({ _id }) => toIdString(_id));
};

export const findPurgeDependencies = async (
  ids: string[]
): Promise<TUserPurgeDependency[]> => {
  if (!ids.length) return [];

  const [
    articleAuthors,
    articleCollaborators,
    projectAuthors,
    projectClients,
    projectCollaborators,
    reviewAuthors,
    fileAuthors,
  ] = await Promise.all([
    setSoftDeleteScope(
      Article.distinct("author", { author: { $in: ids } }),
      "with_deleted"
    ),
    setSoftDeleteScope(
      Article.distinct("collaborators", { collaborators: { $in: ids } }),
      "with_deleted"
    ),
    setSoftDeleteScope(
      Project.distinct("author", { author: { $in: ids } }),
      "with_deleted"
    ),
    setSoftDeleteScope(
      Project.distinct("client", { client: { $in: ids } }),
      "with_deleted"
    ),
    setSoftDeleteScope(
      Project.distinct("collaborators", { collaborators: { $in: ids } }),
      "with_deleted"
    ),
    setSoftDeleteScope(
      Review.distinct("author", { author: { $in: ids } }),
      "with_deleted"
    ),
    setSoftDeleteScope(
      File.distinct("author", { author: { $in: ids } }),
      "with_deleted"
    ),
  ]);

  const dependencies = new Map<string, TUserPurgeDependency["dependencies"]>();
  const addDependencies = (
    values: unknown[],
    dependency: TUserPurgeDependency["dependencies"][number]
  ) => {
    for (const value of values) {
      const id = toIdString(value);
      const current = dependencies.get(id) ?? [];
      if (!current.includes(dependency)) current.push(dependency);
      dependencies.set(id, current);
    }
  };

  addDependencies(articleAuthors, "authored_articles");
  addDependencies(articleCollaborators, "collaborating_articles");
  addDependencies(projectAuthors, "authored_projects");
  addDependencies(projectClients, "client_projects");
  addDependencies(projectCollaborators, "collaborating_projects");
  addDependencies(reviewAuthors, "reviews");
  addDependencies(fileAuthors, "files");

  return [...dependencies].map(([id, entityDependencies]) => ({
    id,
    dependencies: entityDependencies,
  }));
};

export const countActiveSuperAdmins = async (): Promise<number> =>
  await User.countDocuments({
    role: "super-admin",
    status: "in-progress",
  });

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const userQuery = new AppQuery<TUser>(
    setSoftDeleteScope(User.find(), scope),
    queryParams
  )
    .search(["name", "email"])
    .filter(["role", "status", "is_verified"])
    .sort(["name", "email", "role", "status", "created_at"])
    .paginate()
    .fields([
      "image",
      "name",
      "email",
      "role",
      "status",
      "is_verified",
      "created_at",
      "updated_at",
    ]);

  const result = await userQuery.execute();

  const populated = await Promise.all(
    result.data.map(async (user) => {
      return await setSoftDeleteScope(
        User.findById((user as unknown as { _id: unknown })._id),
        scope
      )
        .populate({ path: "image", select: FILE_SELECT })
        .lean();
    })
  );

  return { data: populated, meta: result.meta };
};

export const updateById = async (
  id: string,
  payload: Partial<TUser>,
  session?: ClientSession
) => {
  return await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
    session,
  }).populate({ path: "image", select: FILE_SELECT });
};

export const updateMany = async (ids: string[], payload: Partial<TUser>) => {
  return await User.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const softDeleteMany = async (ids: string[]) => {
  return await User.updateMany(
    { _id: { $in: ids } },
    { is_deleted: true, deleted_at: new Date() }
  );
};

export const softDeleteById = async (id: string) => {
  return await User.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true, runValidators: false }
  );
};

export const restoreById = async (id: string) => {
  return await setSoftDeleteScope(
    User.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );
};

export const restoreMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    User.updateMany(
      { _id: { $in: ids } },
      { is_deleted: false, deleted_at: null }
    ),
    "only_deleted"
  );
};

export const hardDeleteById = async (id: string) => {
  return await setSoftDeleteScope(User.findByIdAndDelete(id), "only_deleted");
};

export const hardDeleteMany = async (ids: string[]) => {
  return await setSoftDeleteScope(
    User.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
};
