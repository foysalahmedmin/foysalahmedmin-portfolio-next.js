import { NextResponse } from 'next/server';
import type { TResponse } from '@/types/response.type';

const sendResponse = <T>(
  payload: TResponse<T>,
): NextResponse<TResponse<T>> => {
  const { status, success, message, data, meta } = payload;
  return NextResponse.json(
    {
      success: success,
      status: status,
      message: message ?? (status === 200 || status === 201 ? 'Success' : ''),
      data: data,
      ...(meta && { meta }),
    },
    { status },
  );
};

export default sendResponse;

