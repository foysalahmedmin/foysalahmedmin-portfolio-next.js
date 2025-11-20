import { NextRequest, NextResponse } from 'next/server';
import { ZodTypeAny, ZodError } from 'zod';
import AppError from '@/builder/AppError';
import httpStatus from 'http-status';
import { TErrorSources } from '@/types/response.type';

const handleZodError = (err: ZodError): { status: number; message: string; sources: TErrorSources } => {
  const sources: TErrorSources = err.issues.map((issue) => {
    return {
      path: issue?.path[issue.path.length - 1] ?? '',
      message: issue.message,
    };
  });

  return {
    status: 400,
    message: 'Validation Error',
    sources,
  };
};

export const validation = (schema: ZodTypeAny) => {
  return async (
    req: NextRequest & { params?: Record<string, string> },
    handler: (req: NextRequest & { parsedBody?: unknown; parsedQuery?: unknown; parsedParams?: unknown }) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    try {
      const body = await req.json().catch(() => ({}));
      const url = new URL(req.url);
      const queryParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      const parsed = await schema.parseAsync({
        params: req.params || {},
        query: queryParams,
        body: body,
      });

      // Create a new request-like object with parsed data
      const modifiedReq = {
        ...req,
        parsedBody: parsed.body,
        parsedQuery: parsed.query,
        parsedParams: parsed.params,
      } as NextRequest & {
        parsedBody?: unknown;
        parsedQuery?: unknown;
        parsedParams?: unknown;
        params?: Record<string, string>;
      };

      return await handler(modifiedReq);
    } catch (err) {
      if (err instanceof ZodError) {
        const error = handleZodError(err);
        throw new AppError(error.status, error.message);
      }
      throw err;
    }
  };
};

