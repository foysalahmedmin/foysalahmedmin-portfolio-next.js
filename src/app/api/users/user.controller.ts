import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import * as UserService from './user.service';

export const getSelf = catchAsync(async (req: AuthRequest) => {
  const userId = req.user?._id || req.user?.id;
  if (!userId) {
    throw new Error('User ID not found');
  }
  const result = await UserService.getUser(userId);
  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'User retrieved successfully',
    data: result,
  });
});

export const getUser = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const userId = params.id || req.user?._id || req.user?.id;
    if (!userId) {
      throw new Error('User ID not found');
    }
    const result = await UserService.getUser(userId);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User retrieved successfully',
      data: result,
    });
  },
);

export const getUsers = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await UserService.getUsers(queryParams);
  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const updateSelf = catchAsync(
  async (req: AuthRequest & { parsedBody?: any; savedFiles?: Record<string, string[]> }) => {
    const body = req.parsedBody || (await req.json());
    const savedFiles = req.savedFiles as Record<string, string[]>;
    const image = savedFiles?.image?.[0] || '';

    const payload = {
      ...body,
      ...(image ? { image } : {}),
    };

    const result = await UserService.updateSelf(req.user!, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User updated successfully',
      data: result,
    });
  },
);

export const updateUser = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any; savedFiles?: Record<string, string[]> },
    { params }: { params: { id: string } },
  ) => {
    const { id } = params;
    const body = req.parsedBody || (await req.json());
    const savedFiles = req.savedFiles as Record<string, string[]>;
    const image = savedFiles?.image?.[0] || '';

    const payload = {
      ...body,
      ...(image ? { image } : {}),
    };

    const result = await UserService.updateUser(id, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User updated successfully',
      data: result,
    });
  },
);

export const updateUsers = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body;
    const result = await UserService.updateUsers(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Users updated successfully',
      data: result,
    });
  },
);

export const deleteUser = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    await UserService.deleteUser(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User soft deleted successfully',
      data: null,
    });
  },
);

export const deleteUserPermanent = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    await UserService.deleteUserPermanent(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteUsers = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await UserService.deleteUsers(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} users soft deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const deleteUsersPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await UserService.deleteUsersPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} users permanently deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const restoreUser = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await UserService.restoreUser(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User restored successfully',
      data: result,
    });
  },
);

export const restoreUsers = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await UserService.restoreUsers(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} users restored successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

