import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import AppError from '@/builder/AppError';
import { ENV } from '@/config';
import { TErrorResponse, TErrorSources } from '@/types/response.type';

const handleZodError = (err: ZodError): TErrorResponse => {
  const sources: TErrorSources = err.issues.map((issue) => {
    return {
      path: issue?.path[issue.path.length - 1] ?? '',
      message: issue.message,
    };
  });

  return {
    success: false,
    status: 400,
    message: 'Validation Error',
    sources,
  };
};

const handleValidationError = (
  err: mongoose.Error.ValidationError,
): TErrorResponse => {
  const sources: TErrorSources = Object.values(err.errors).map(
    (val: mongoose.Error.ValidatorError | mongoose.Error.CastError) => {
      return {
        path: val?.path ?? '',
        message: val?.message ?? '',
      };
    },
  );

  return {
    success: false,
    status: 400,
    message: 'Validation Error',
    sources,
  };
};

const handleCastError = (err: mongoose.Error.CastError): TErrorResponse => {
  const sources: TErrorSources = [
    {
      path: err.path ?? '',
      message: err.message,
    },
  ];

  return {
    success: false,
    status: 400,
    message: 'Invalid ID format',
    sources,
  };
};

const handleDuplicateError = (err: any): TErrorResponse => {
  const match = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
  const extractedMessage = match
    ? match[0].replace(/["']/g, '')
    : 'Duplicate field value';

  const sources: TErrorSources = [
    {
      path: '',
      message: `${extractedMessage} already exists`,
    },
  ];

  return {
    success: false,
    status: 409,
    message: 'Duplicate Entry',
    sources,
  };
};

export const errorHandler = (
  error: unknown,
  _req?: NextRequest,
): NextResponse<TErrorResponse> => {
  let status = 500;
  let message = 'Something went wrong!';
  let sources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong',
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
  } else if (error instanceof AppError) {
    status = error.status;
    message = error.message;
    sources = [
      {
        path: '',
        message: error.message,
      },
    ];
  } else if (error instanceof Error) {
    message = error.message;
    sources = [
      {
        path: '',
        message: error.message,
      },
    ];
  }

  return NextResponse.json(
    {
      success: false,
      status,
      message,
      sources,
      error: {
        status,
        name: error instanceof Error ? error.name : 'Error',
      },
      stack: ENV.environment === 'development' ? (error as Error)?.stack : null,
    },
    { status },
  );
};

