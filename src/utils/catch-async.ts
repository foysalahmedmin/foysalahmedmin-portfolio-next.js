import type { NextRequest, NextResponse } from 'next/server';

type AsyncHandler = (
  req: NextRequest,
  ...args: any[]
) => Promise<NextResponse>;

const catchAsync = (fn: AsyncHandler) => {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      return await fn(req, ...args);
    } catch (error) {
      throw error;
    }
  };
};

export default catchAsync;

