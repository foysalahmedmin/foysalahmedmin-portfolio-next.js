import AppError from "@/builder/app-error";
import {
  deleteUserSessions,
  revokeUserSessions,
} from "@/lib/auth/session-manager";
import connectDB from "@/lib/db";
import type { TJwtPayload, TRole } from "@/types/jsonwebtoken.type";
import httpStatus from "http-status";
import * as FileService from "../files/file.service";
import * as UserRepository from "./user.repository";
import type { TUser } from "./user.type";

const MODEL = "User" as const;

export type TUserLifecycleOperation = "delete" | "permanent-delete" | "restore";

type TUserLifecycleTarget = Pick<TUser, "role"> & { _id: unknown };
type TUserAdminUpdate = Partial<
  Pick<TUser, "name" | "email" | "image" | "role" | "status" | "is_verified">
>;

const USER_MANAGEMENT_ROLES = new Set<TRole>(["super-admin", "admin"]);
const PRIVILEGED_USER_ROLES = new Set<TRole>(["super-admin", "admin"]);

export const getUserLifecyclePolicyViolation = (
  actor: Pick<TJwtPayload, "_id" | "role">,
  target: TUserLifecycleTarget,
  operation: TUserLifecycleOperation
): string | null => {
  const targetId = (target._id as { toString(): string }).toString();
  const operationLabel = operation === "restore" ? "restore" : "delete";

  if (!actor.role || !USER_MANAGEMENT_ROLES.has(actor.role)) {
    return `Your role cannot ${operationLabel} users`;
  }

  if (actor._id === targetId) {
    return `You cannot ${operationLabel} your own account`;
  }

  if (PRIVILEGED_USER_ROLES.has(target.role) && actor.role !== "super-admin") {
    return `Only a super-admin can ${operationLabel} a privileged account`;
  }

  return null;
};

export const wouldDeleteLastActiveSuperAdmin = (
  activeSuperAdminCount: number,
  targets: TUserLifecycleTarget[]
): boolean =>
  targets.filter(({ role }) => role === "super-admin").length >=
  activeSuperAdminCount;

export const getUserUpdatePolicyViolation = (
  actor: Pick<TJwtPayload, "_id" | "role">,
  target: TUserLifecycleTarget,
  payload: TUserAdminUpdate
): string | null => {
  const targetId = (target._id as { toString(): string }).toString();
  const isSelf = actor._id === targetId;
  const changesSensitiveSelfField =
    payload.role !== undefined ||
    payload.status !== undefined ||
    payload.is_verified !== undefined;

  if (!actor.role || !USER_MANAGEMENT_ROLES.has(actor.role)) {
    return "Your role cannot update users";
  }

  if (isSelf && changesSensitiveSelfField) {
    return "You cannot change your own role, status, or verification state";
  }

  if (
    !isSelf &&
    PRIVILEGED_USER_ROLES.has(target.role) &&
    actor.role !== "super-admin"
  ) {
    return "Only a super-admin can update a privileged account";
  }

  if (
    payload.role &&
    PRIVILEGED_USER_ROLES.has(payload.role) &&
    actor.role !== "super-admin"
  ) {
    return "Only a super-admin can assign a privileged role";
  }

  return null;
};

const assertUserLifecycleAuthority = (
  actor: Pick<TJwtPayload, "_id" | "role">,
  targets: TUserLifecycleTarget[],
  operation: TUserLifecycleOperation
): void => {
  for (const target of targets) {
    const violation = getUserLifecyclePolicyViolation(actor, target, operation);
    if (violation) {
      throw new AppError(httpStatus.FORBIDDEN, violation);
    }
  }
};

const assertUserUpdateAuthority = (
  actor: Pick<TJwtPayload, "_id" | "role">,
  targets: TUserLifecycleTarget[],
  payload: TUserAdminUpdate
): void => {
  for (const target of targets) {
    const violation = getUserUpdatePolicyViolation(actor, target, payload);
    if (violation) {
      throw new AppError(httpStatus.FORBIDDEN, violation);
    }
  }
};

const assertSuperAdminContinuity = async (
  targets: TUserLifecycleTarget[]
): Promise<void> => {
  if (!targets.some(({ role }) => role === "super-admin")) return;

  const activeSuperAdminCount = await UserRepository.countActiveSuperAdmins();
  if (wouldDeleteLastActiveSuperAdmin(activeSuperAdminCount, targets)) {
    throw new AppError(
      httpStatus.CONFLICT,
      "At least one active super-admin account must remain"
    );
  }
};

const assertSuperAdminUpdateContinuity = async (
  targets: TUserLifecycleTarget[],
  payload: TUserAdminUpdate
): Promise<void> => {
  const removesSuperAdminAuthority =
    payload.status === "blocked" ||
    (payload.role !== undefined && payload.role !== "super-admin");
  if (!removesSuperAdminAuthority) return;

  await assertSuperAdminContinuity(
    targets.filter(({ role }) => role === "super-admin")
  );
};

const assertUsersHaveNoPurgeDependencies = async (
  ids: string[]
): Promise<void> => {
  const dependencies = await UserRepository.findPurgeDependencies(ids);
  if (!dependencies.length) return;

  throw new AppError(
    httpStatus.CONFLICT,
    `Cannot permanently delete users with dependent records: ${dependencies
      .map(
        ({ id, dependencies: entityDependencies }) =>
          `${id} (${entityDependencies.join(", ")})`
      )
      .join("; ")}`
  );
};

const toIdString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: { toString(): string }; toString?(): string };
    if (obj._id) return obj._id.toString();
    if (obj.toString) return obj.toString();
  }
  return null;
};

export const getUser = async (id: string) => {
  await connectDB();
  const result = await UserRepository.findByIdLean(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return result;
};

export const getUsers = async (query: Record<string, unknown>) => {
  await connectDB();
  return await UserRepository.findPaginated(query);
};

const updateUserWithImageReference = async (params: {
  actor: TJwtPayload;
  id: string;
  payload: Partial<TUser>;
  previous_image: string | null;
}) => {
  if (params.payload.image === undefined) {
    return await UserRepository.updateById(params.id, params.payload);
  }

  const nextImage = params.payload.image ? String(params.payload.image) : null;
  if (nextImage) {
    await FileService.validateFileIds([nextImage], ["profile"], params.actor);
  }
  const db = await connectDB();
  const session = await db.startSession();
  let result: Awaited<ReturnType<typeof UserRepository.updateById>> | undefined;
  try {
    await session.withTransaction(async () => {
      result = await UserRepository.updateById(
        params.id,
        params.payload,
        session
      );
      if (!result) {
        throw new AppError(httpStatus.NOT_FOUND, "User not found");
      }
      await FileService.reconcileEntityRefs({
        model: MODEL,
        entity: params.id,
        field: "image",
        previous: params.previous_image,
        next: nextImage,
        actor: params.actor,
        session,
      });
    });
  } finally {
    await session.endSession();
  }
  return result;
};

export const updateSelf = async (
  user: TJwtPayload,
  payload: Partial<Pick<TUser, "name" | "email" | "image">>
) => {
  await connectDB();

  const data = await UserRepository.findById(user._id);
  if (!data) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (payload.email && data.email !== payload.email) {
    const emailExists = await UserRepository.findByEmail(payload.email);
    if (emailExists) {
      throw new AppError(httpStatus.CONFLICT, "Email already exists");
    }
  }

  return await updateUserWithImageReference({
    actor: user,
    id: user._id,
    payload,
    previous_image: toIdString(data.image),
  });
};

export const updateUser = async (
  actor: TJwtPayload,
  id: string,
  payload: TUserAdminUpdate
) => {
  await connectDB();

  const data = await UserRepository.findById(id);
  if (!data) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  assertUserUpdateAuthority(actor, [data], payload);
  await assertSuperAdminUpdateContinuity([data], payload);

  if (payload.email && data.email !== payload.email) {
    const emailExists = await UserRepository.findByEmail(payload.email);
    if (emailExists && emailExists._id.toString() !== id) {
      throw new AppError(httpStatus.CONFLICT, "Email already exists");
    }
  }

  const result = await updateUserWithImageReference({
    actor,
    id,
    payload,
    previous_image: toIdString(data.image),
  });
  if (payload.role !== undefined && payload.role !== data.role) {
    await revokeUserSessions(id, "role-changed");
  } else if (payload.status !== undefined && payload.status !== data.status) {
    await revokeUserSessions(id, "status-changed");
  }
  return result;
};

export const updateUsers = async (
  actor: TJwtPayload,
  ids: string[],
  payload: Partial<Pick<TUser, "role" | "status" | "is_verified">>
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const users = await UserRepository.findManyByIds(ids);
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  assertUserUpdateAuthority(actor, users, payload);
  await assertSuperAdminUpdateContinuity(users, payload);

  const result = await UserRepository.updateMany(foundIds, payload);
  if (payload.role !== undefined || payload.status !== undefined) {
    await Promise.all(
      foundIds.map((userId) =>
        revokeUserSessions(
          userId,
          payload.role !== undefined ? "role-changed" : "status-changed"
        )
      )
    );
  }

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteUser = async (
  actor: TJwtPayload,
  id: string
): Promise<void> => {
  await connectDB();
  const user = await UserRepository.findById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  assertUserLifecycleAuthority(actor, [user], "delete");
  await assertSuperAdminContinuity([user]);

  const deleted = await UserRepository.softDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User changed while deletion was in progress"
    );
  }
  await revokeUserSessions(id, "user-deleted");
};

export const deleteUserPermanent = async (
  actor: TJwtPayload,
  id: string
): Promise<void> => {
  await connectDB();
  const user = await UserRepository.findDeletedById(id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  assertUserLifecycleAuthority(actor, [user], "permanent-delete");
  await assertUsersHaveNoPurgeDependencies([id]);
  await deleteUserSessions(id);

  const deleted = await UserRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User changed while permanent deletion was in progress"
    );
  }

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
};

export const deleteUsers = async (
  actor: TJwtPayload,
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const users = await UserRepository.findManyByIds(ids);
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  assertUserLifecycleAuthority(actor, users, "delete");
  await assertSuperAdminContinuity(users);

  const result = await UserRepository.softDeleteMany(foundIds);
  await Promise.all(
    foundIds.map((userId) => revokeUserSessions(userId, "user-deleted"))
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteUsersPermanent = async (
  actor: TJwtPayload,
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const users = await UserRepository.findDeletedManyByIds(ids);
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  assertUserLifecycleAuthority(actor, users, "permanent-delete");
  await assertUsersHaveNoPurgeDependencies(foundIds);

  const outcomes = await Promise.all(
    foundIds.map(async (entityId) => {
      await deleteUserSessions(entityId);
      const deleted = await UserRepository.hardDeleteById(entityId);
      if (!deleted) return false;

      await FileService.detachAllForEntity({ model: MODEL, entity: entityId });
      return true;
    })
  );
  const notDeletedIds = foundIds.filter((_, index) => !outcomes[index]);

  return {
    count: outcomes.filter(Boolean).length,
    not_found_ids: [...new Set([...notFoundIds, ...notDeletedIds])],
  };
};

export const restoreUser = async (actor: TJwtPayload, id: string) => {
  await connectDB();

  const candidate = await UserRepository.findDeletedById(id);
  if (!candidate) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found or not deleted");
  }

  assertUserLifecycleAuthority(actor, [candidate], "restore");
  const notRestorableIds = await UserRepository.findNotRestorableIds([
    candidate,
  ]);
  if (notRestorableIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User cannot be restored because the email is already active"
    );
  }

  const user = await UserRepository.restoreById(id);
  if (!user) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User changed while restoration was in progress"
    );
  }

  return user;
};

export const restoreUsers = async (
  actor: TJwtPayload,
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids: string[];
}> => {
  await connectDB();

  const users = await UserRepository.findDeletedManyByIds(ids);
  const foundIds = users.map((user) => user._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  assertUserLifecycleAuthority(actor, users, "restore");
  const notRestorableIds = await UserRepository.findNotRestorableIds(users);
  const notRestorableSet = new Set(notRestorableIds);
  const restorableIds = foundIds.filter((id) => !notRestorableSet.has(id));
  const result = restorableIds.length
    ? await UserRepository.restoreMany(restorableIds)
    : { modifiedCount: 0 };

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
    not_restorable_ids: notRestorableIds,
  };
};
