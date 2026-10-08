import type { AuthRequest } from "@/middleware/auth.middleware";
import catchAsync from "@/utils/catch-async";
import sendResponse from "@/utils/send-response";
import httpStatus from "http-status";
import * as CaseStudyCategoryService from "./case-study-category.service";

export const getCaseStudyCategories = catchAsync(
  async (req: AuthRequest | Request) => {
    const url = new URL(req.url);
    const queryParams: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const result =
      await CaseStudyCategoryService.getCaseStudyCategories(queryParams);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }
);

export const getPublicCaseStudyCategories = catchAsync(async (req: Request) => {
  const url = new URL(req.url);
  const queryParams: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  const result =
    await CaseStudyCategoryService.getPublicCaseStudyCategories(queryParams);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: "Case study categories retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const getCaseStudyCategoryBySlug = catchAsync(
  async (
    req: AuthRequest | Request,
    { params }: { params: { slug: string } }
  ) => {
    const category = await CaseStudyCategoryService.getCaseStudyCategoryBySlug(
      params.slug
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category retrieved successfully",
      data: category,
    });
  }
);

export const getPublicCaseStudyCategoryBySlug = catchAsync(
  async (req: Request, { params }: { params: { slug: string } }) => {
    const category =
      await CaseStudyCategoryService.getPublicCaseStudyCategoryBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category retrieved successfully",
      data: category,
    });
  }
);

export const getCaseStudyCategoryById = catchAsync(
  async (
    req: AuthRequest | Request,
    { params }: { params: { id: string } }
  ) => {
    const category = await CaseStudyCategoryService.getCaseStudyCategoryById(
      params.id
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category retrieved successfully",
      data: category,
    });
  }
);

export const getPublicCaseStudyCategoryById = catchAsync(
  async (req: Request, { params }: { params: { id: string } }) => {
    const category =
      await CaseStudyCategoryService.getPublicCaseStudyCategoryByIdentifier(
        params.id
      );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category retrieved successfully",
      data: category,
    });
  }
);

export const createCaseStudyCategory = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());

    const category = await CaseStudyCategoryService.createCaseStudyCategory(body);

    return sendResponse({
      status: httpStatus.CREATED,
      success: true,
      message: "Case study category created successfully",
      data: category,
    });
  }
);

export const updateCaseStudyCategoryBySlug = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { slug: string } }
  ) => {
    const body = req.parsedBody || (await req.json());

    const category = await CaseStudyCategoryService.updateCaseStudyCategoryBySlug(
      params.slug,
      body
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category updated successfully",
      data: category,
    });
  }
);

export const updateCaseStudyCategoryById = catchAsync(
  async (
    req: AuthRequest & { parsedBody?: any },
    { params }: { params: { id: string } }
  ) => {
    const body = req.parsedBody || (await req.json());
    const category = await CaseStudyCategoryService.updateCaseStudyCategoryById(
      params.id,
      body
    );

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category updated successfully",
      data: category,
    });
  }
);

export const updateCaseStudyCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs, ...payload } = body;
    const result = await CaseStudyCategoryService.updateCaseStudyCategories(
      slugs,
      payload
    );
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study categories updated successfully",
      data: result,
    });
  }
);

export const deleteCaseStudyCategoryBySlug = catchAsync(
  async (req: AuthRequest, { params }: { params: { slug: string } }) => {
    await CaseStudyCategoryService.deleteCaseStudyCategoryBySlug(params.slug);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category deleted successfully",
      data: null,
    });
  }
);

export const deleteCaseStudyCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await CaseStudyCategoryService.deleteCaseStudyCategoryById(params.id);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category deleted successfully",
      data: null,
    });
  }
);

export const deleteCaseStudyCategoryPermanentById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    await CaseStudyCategoryService.deleteCaseStudyCategoryPermanentById(params.id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category permanently deleted successfully",
      data: null,
    });
  }
);

export const deleteCaseStudyCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { slugs } = body;
    const result = await CaseStudyCategoryService.deleteCaseStudyCategories(slugs);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} case study categories deleted successfully`,
      data: result,
    });
  }
);

export const deleteCaseStudyCategoriesPermanent = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result =
      await CaseStudyCategoryService.deleteCaseStudyCategoriesPermanent(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} case study categories permanently deleted successfully`,
      data: result,
    });
  }
);

export const restoreCaseStudyCategoryById = catchAsync(
  async (req: AuthRequest, { params }: { params: { id: string } }) => {
    const { id } = params;
    const result = await CaseStudyCategoryService.restoreCaseStudyCategoryById(id);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: "Case study category restored successfully",
      data: result,
    });
  }
);

export const restoreCaseStudyCategories = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const { ids } = body;
    const result = await CaseStudyCategoryService.restoreCaseStudyCategories(ids);
    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: `${result.count} case study categories restored successfully`,
      data: result,
    });
  }
);
