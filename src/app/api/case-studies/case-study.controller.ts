import type { AuthRequest } from "@/middleware/auth.middleware";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import * as CaseStudyService from "./case-study.service";

export const getCaseStudies = catchAsync(async (req: AuthRequest | Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await CaseStudyService.getCaseStudies(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Case studies retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getPublicCaseStudies = catchAsync(async (req: Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result = await CaseStudyService.getPublicCaseStudyDiscovery(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Case studies retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getCaseStudyById = catchAsync(
  async (
    req: AuthRequest | Request,
    { params }: { params: { id: string } }
  ) => {
    const caseStudy = await CaseStudyService.getCaseStudyById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study retrieved successfully",
      data: caseStudy,
    });
  }
);

export const getPublicCaseStudyById = catchAsync(
  async (req: Request, { params }: { params: { id: string } }) => {
    const caseStudy = await CaseStudyService.getPublicCaseStudyByIdentifier(
      params.id
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study retrieved successfully",
      data: caseStudy,
    });
  }
);

export const createCaseStudy = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());

    const caseStudy = await CaseStudyService.createCaseStudy(
      {
        ...body,
        author: req.user?._id || req.user?.id,
      },
      req.user!
    );

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: "Case study created successfully",
      data: caseStudy,
    });
  }
);

export const updateCaseStudyById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: Record<string, unknown> },
    { params }: { params: { id: string } }
  ) => {
    const body = req.parsedBody || (await req.json());

    const caseStudy = await CaseStudyService.updateCaseStudyById(
      params.id,
      body,
      req.user!
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study updated successfully",
      data: caseStudy,
    });
  }
);

export const updateCaseStudies = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids, ...payload } = body as {
      ids: string[];
      [key: string]: unknown;
    };
    const result = await CaseStudyService.updateCaseStudies(ids, payload);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case studies updated successfully",
      data: result,
    });
  }
);

export const deleteCaseStudyById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await CaseStudyService.deleteCaseStudyById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study deleted successfully",
      data: null,
    });
  }
);

export const deleteCaseStudyPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await CaseStudyService.deleteCaseStudyPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study permanently deleted successfully",
      data: null,
    });
  }
);

export const deleteCaseStudies = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await CaseStudyService.deleteCaseStudies(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} case studies deleted successfully`,
      data: result,
    });
  }
);

export const deleteCaseStudiesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await CaseStudyService.deleteCaseStudiesPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} case studies permanently deleted successfully`,
      data: result,
    });
  }
);

export const restoreCaseStudyById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await CaseStudyService.restoreCaseStudyById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study restored successfully",
      data: result,
    });
  }
);

export const restoreCaseStudies = catchAsync(
  async (req: AuthRequest & { parsedBody?: Record<string, unknown> }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body as { ids: string[] };
    const result = await CaseStudyService.restoreCaseStudies(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} case studies restored successfully`,
      data: result,
    });
  }
);
