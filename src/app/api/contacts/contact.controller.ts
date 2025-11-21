import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catch-async';
import sendResponse from '@/utils/send-response';
import httpStatus from 'http-status';
import * as ContactService from './contact.service';

export const getContacts = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await ContactService.getContacts(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Contacts retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

export const getContactById = catchAsync(
  async (req: AuthRequest | Request, { params }: { params: { id: string } }) => {
    const contact = await ContactService.getContactById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Contact retrieved successfully',
      data: contact,
    });
  },
);

export const createContact = catchAsync(
  async (req: Request & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const contact = await ContactService.createContact(body);

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  },
);

export const updateContactById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } },
  ) => {
    const body = req.parsedBody || (await req.json());
    const contact = await ContactService.updateContactById(params.id, body);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  },
);

export const updateContacts = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body;
    const result = await ContactService.updateContacts(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Contacts updated successfully',
      data: result,
    });
  },
);

export const deleteContactById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ContactService.deleteContactById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Contact deleted successfully',
      data: null,
    });
  },
);

export const deleteContactPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await ContactService.deleteContactPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Contact permanently deleted successfully',
      data: null,
    });
  },
);

export const deleteContacts = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ContactService.deleteContacts(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} contacts deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const deleteContactsPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ContactService.deleteContactsPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} contacts permanently deleted successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

export const restoreContactById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await ContactService.restoreContactById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Contact restored successfully',
      data: result,
    });
  },
);

export const restoreContacts = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await ContactService.restoreContacts(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} contacts restored successfully`,
      data: {
        not_found_ids: result.not_found_ids,
      },
    });
  },
);

