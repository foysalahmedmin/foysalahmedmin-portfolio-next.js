import AppError from '@/builder/app-error';
import type { TErrorSources } from '@/types/response.type';
import type { NextRequest, NextResponse } from 'next/server';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';

const handleZodError = (err: ZodError): { status: number; message: string; sources: TErrorSources } => {
  const sources: TErrorSources = err.issues.map((issue) => {
    return {
      path: (issue?.path[issue.path.length - 1] as string | number) ?? '',
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
    req: NextRequest & { params?: Record<string, string>; parsedBody?: unknown },
    handler: (req: NextRequest & { parsedBody?: unknown; parsedQuery?: unknown; parsedParams?: unknown }) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    try {
      const body = req.parsedBody ?? (await req.json().catch(() => ({})));
      const url = new URL(req.url);
      const queryParams: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });

      const parsed: any = await schema.parseAsync({
        params: req.params || {},
        query: queryParams,
        body: body,
      });

      const modifiedReq = Object.assign(req, {
        parsedBody: parsed.body,
        parsedQuery: parsed.query,
        parsedParams: parsed.params,
      }) as NextRequest & {
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
