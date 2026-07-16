import AppError from "@/builder/app-error";
import { assertTrustedAuthRequest } from "@/lib/auth/auth-request-security";
import type { AuthRequest, AuthUser } from "@/middleware/auth.middleware";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import { NextResponse } from "next/server";
import * as ContactService from "./contact.service";
import { parseContactInboxQuery } from "./contact.validation";

type ParsedAuthRequest = AuthRequest & { parsedBody?: unknown };

const requireActor = (request: AuthRequest): AuthUser => {
  if (!request.user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
  }
  return request.user;
};

const privateResponse = <T>(response: T): T => {
  const candidate = response as T & { headers?: Headers };
  candidate.headers?.set("Cache-Control", "private, no-store, max-age=0");
  candidate.headers?.set("Pragma", "no-cache");
  candidate.headers?.set("Vary", "Cookie, Authorization");
  candidate.headers?.set("X-Content-Type-Options", "nosniff");
  return response;
};

const bodyOf = async <T>(request: ParsedAuthRequest): Promise<T> =>
  (request.parsedBody ?? (await request.json())) as T;

const assertTrustedMutation = (request: Request): void =>
  assertTrustedAuthRequest(request);

export const getContacts = catchAsync(async (req: AuthRequest | Request) => {
  const input = Object.fromEntries(new URL(req.url).searchParams.entries());
  const result = await ContactService.getContacts(
    parseContactInboxQuery(input)
  );
  return privateResponse(
    sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Contacts retrieved successfully",
      data: result.data,
      meta: result.meta,
    })
  );
});

export const getContactById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) =>
    privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact retrieved successfully",
        data: await ContactService.getContactById(params.id),
      })
    )
);

export const exportContactById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    const data = await ContactService.exportContactById(
      params.id,
      requireActor(req)
    );
    const response = NextResponse.json(data, { status: httpStatus.OK });
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="contact-${params.id}.json"`
    );
    return privateResponse(response);
  }
);

export const updateContactById = catchAsync(
  async (req: ParsedAuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    const body = await bodyOf<{
      status: Parameters<typeof ContactService.updateContactById>[1]["status"];
      expected_revision: number;
    }>(req);
    const contact = await ContactService.updateContactById(
      params.id,
      body,
      requireActor(req)
    );
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact status updated successfully",
        data: contact,
      })
    );
  }
);

export const updateContacts = catchAsync(async (req: ParsedAuthRequest) => {
  assertTrustedMutation(req);
  const body = await bodyOf<{
    ids: string[];
    status: Parameters<typeof ContactService.updateContacts>[1];
  }>(req);
  const result = await ContactService.updateContacts(
    body.ids,
    body.status,
    requireActor(req)
  );
  return privateResponse(
    sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Contact status update completed",
      data: result,
    })
  );
});

export const retryContactDelivery = catchAsync(
  async (req: ParsedAuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    const body = await bodyOf<{ expected_revision: number }>(req);
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact delivery queued for retry",
        data: await ContactService.retryContactDelivery(
          params.id,
          body.expected_revision,
          requireActor(req)
        ),
      })
    );
  }
);

export const placeContactRetentionHold = catchAsync(
  async (req: ParsedAuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    const body = await bodyOf<{
      reason_code: Parameters<
        typeof ContactService.placeContactRetentionHold
      >[1]["reason_code"];
      expires_at: string;
      expected_revision: number;
    }>(req);
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact retention hold placed",
        data: await ContactService.placeContactRetentionHold(
          params.id,
          body,
          requireActor(req)
        ),
      })
    );
  }
);

export const releaseContactRetentionHold = catchAsync(
  async (req: ParsedAuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    const body = await bodyOf<{ expected_revision: number }>(req);
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact retention hold released",
        data: await ContactService.releaseContactRetentionHold(
          params.id,
          body.expected_revision,
          requireActor(req)
        ),
      })
    );
  }
);

export const anonymizeContactById = catchAsync(
  async (req: ParsedAuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    const body = await bodyOf<{ expected_revision: number }>(req);
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact personal data anonymized",
        data: await ContactService.anonymizeContactById(
          params.id,
          body.expected_revision,
          requireActor(req)
        ),
      })
    );
  }
);

export const deleteContactById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    await ContactService.deleteContactById(params.id, requireActor(req));
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact deleted successfully",
        data: null,
      })
    );
  }
);

export const deleteContactPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    await ContactService.deleteContactPermanentById(
      params.id,
      requireActor(req)
    );
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact permanently deleted successfully",
        data: null,
      })
    );
  }
);

export const deleteContacts = catchAsync(async (req: ParsedAuthRequest) => {
  assertTrustedMutation(req);
  const { ids } = await bodyOf<{ ids: string[] }>(req);
  const result = await ContactService.deleteContacts(ids, requireActor(req));
  return privateResponse(
    sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} contacts deleted successfully`,
      data: result,
    })
  );
});

export const deleteContactsPermanent = catchAsync(
  async (req: ParsedAuthRequest) => {
    assertTrustedMutation(req);
    const { ids } = await bodyOf<{ ids: string[] }>(req);
    const result = await ContactService.deleteContactsPermanent(
      ids,
      requireActor(req)
    );
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: `${result.count} contacts permanently deleted successfully`,
        data: result,
      })
    );
  }
);

export const restoreContactById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    assertTrustedMutation(req);
    return privateResponse(
      sendResponse({
        status: httpStatus.OK,
        success: true,
        message: "Contact restored successfully",
        data: await ContactService.restoreContactById(
          params.id,
          requireActor(req)
        ),
      })
    );
  }
);

export const restoreContacts = catchAsync(async (req: ParsedAuthRequest) => {
  assertTrustedMutation(req);
  const { ids } = await bodyOf<{ ids: string[] }>(req);
  const result = await ContactService.restoreContacts(ids, requireActor(req));
  return privateResponse(
    sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} contacts restored successfully`,
      data: result,
    })
  );
});
