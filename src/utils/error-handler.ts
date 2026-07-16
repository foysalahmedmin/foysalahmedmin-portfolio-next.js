import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import type { TErrorResponse, TErrorSources } from "@/types/response.type";
import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getCorrelationId,
  getSafeRequestPath,
  logServerEvent,
} from "@/lib/observability/request-context";

const handleZodError = (err: ZodError): TErrorResponse => {
  const sources: TErrorSources = err.issues.map((issue) => {
    return {
      path: (issue?.path[issue.path.length - 1] as string | number) ?? "",
      message: issue.message,
    };
  });

  return {
    success: false,
    status: 400,
    message: "Validation Error",
    sources,
  };
};

const handleValidationError = (
  err: mongoose.Error.ValidationError
): TErrorResponse => {
  const sources: TErrorSources = Object.values(err.errors).map(
    (val: mongoose.Error.ValidatorError | mongoose.Error.CastError) => {
      return {
        path: val?.path ?? "",
        message: val?.message ?? "",
      };
    }
  );

  return {
    success: false,
    status: 400,
    message: "Validation Error",
    sources,
  };
};

const handleCastError = (err: mongoose.Error.CastError): TErrorResponse => {
  const sources: TErrorSources = [
    {
      path: err.path ?? "",
      message: err.message,
    },
  ];

  return {
    success: false,
    status: 400,
    message: "Invalid ID format",
    sources,
  };
};

const handleDuplicateError = (err: any): TErrorResponse => {
  const match = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
  const extractedMessage = match
    ? match[0].replace(/["']/g, "")
    : "Duplicate field value";

  const sources: TErrorSources = [
    {
      path: "",
      message: `${extractedMessage} already exists`,
    },
  ];

  return {
    success: false,
    status: 409,
    message: "Duplicate Entry",
    sources,
  };
};

export const errorHandler = (
  error: unknown,
  req?: NextRequest
): NextResponse<TErrorResponse> => {
  const correlationId = getCorrelationId(req);
  let status = 500;
  let message = "Something went wrong!";
  let code: string | undefined;
  let currentVersion: number | undefined;
  let sources: TErrorSources = [
    {
      path: "",
      message: "Something went wrong",
    },
  ];

  if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error);
    status = simplifiedError.status;
    message = simplifiedError.message;
    sources = simplifiedError.sources ?? sources;
  } else if (error instanceof mongoose.Error.ValidationError) {
    const simplifiedError = handleValidationError(error);
    status = simplifiedError.status;
    message = simplifiedError.message;
    sources = simplifiedError.sources ?? sources;
  } else if (error instanceof mongoose.Error.CastError) {
    const simplifiedError = handleCastError(error);
    status = simplifiedError.status;
    message = simplifiedError.message;
    sources = simplifiedError.sources ?? sources;
  } else if ((error as any)?.code === 11000) {
    const simplifiedError = handleDuplicateError(error);
    status = simplifiedError.status;
    message = simplifiedError.message;
    sources = simplifiedError.sources ?? sources;
    code = "DUPLICATE_ENTRY";
  } else if (error instanceof AppError) {
    status = error.status;
    message = error.message;
    const domainError = error as AppError & {
      code?: unknown;
      sources?: unknown;
      current_version?: unknown;
    };
    if (
      typeof domainError.code === "string" &&
      /^[A-Z][A-Z0-9_]{1,63}$/.test(domainError.code)
    ) {
      code = domainError.code;
    }
    if (Array.isArray(domainError.sources)) {
      sources = domainError.sources
        .filter(
          (source): source is { path: string | number; message: string } =>
            Boolean(source) &&
            typeof source === "object" &&
            (typeof source.path === "string" ||
              typeof source.path === "number") &&
            typeof source.message === "string"
        )
        .slice(0, 50)
        .map((source) => ({
          path: source.path,
          message: source.message.slice(0, 240),
        }));
    } else {
      sources = [{ path: "", message: error.message }];
    }
    if (
      typeof domainError.current_version === "number" &&
      Number.isSafeInteger(domainError.current_version) &&
      domainError.current_version >= 1
    ) {
      currentVersion = domainError.current_version;
    }
  } else if (error instanceof Error) {
    if (ENV.environment === "development") {
      message = error.message;
      sources = [{ path: "", message: error.message }];
    }
  }

  const retryAfterSeconds = Number(
    (error as { retryAfterSeconds?: unknown })?.retryAfterSeconds
  );
  const headers =
    Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0
      ? { "Retry-After": String(Math.min(retryAfterSeconds, 86_400)) }
      : undefined;

  if (status >= 500) {
    logServerEvent("error", "api.request.failed", {
      correlation_id: correlationId,
      method: req?.method,
      path: getSafeRequestPath(req),
      status,
      error_name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  const response = NextResponse.json<TErrorResponse>(
    {
      success: false as const,
      status,
      ...(code ? { code } : {}),
      message,
      correlation_id: correlationId,
      sources,
      ...(currentVersion !== undefined
        ? { current_version: currentVersion }
        : {}),
      error: {
        status,
        name:
          status >= 500 && ENV.environment !== "development"
            ? "InternalServerError"
            : code || (error instanceof Error ? error.name : "Error"),
      },
      stack: ENV.environment === "development" ? (error as Error)?.stack : null,
    },
    { status, headers }
  );
  response.headers.set("X-Correlation-Id", correlationId);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
};
