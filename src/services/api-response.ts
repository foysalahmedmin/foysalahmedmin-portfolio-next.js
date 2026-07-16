import type { TResponse } from "@/types/response.type";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly correlationId?: string;

  constructor(input: {
    status: number;
    message: string;
    code?: string;
    correlationId?: string;
  }) {
    super(input.message);
    this.name = "ApiRequestError";
    this.status = input.status;
    this.code = input.code;
    this.correlationId = input.correlationId;
  }
}

export async function readApiResponse<T>(
  response: Response
): Promise<TResponse<T>> {
  const raw = await response.text();
  let parsed: unknown;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const record =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    throw new ApiRequestError({
      status: response.status,
      message:
        typeof record.message === "string" ? record.message : "Request failed",
      code:
        typeof record.error_code === "string" ? record.error_code : undefined,
      correlationId:
        typeof record.correlation_id === "string"
          ? record.correlation_id
          : response.headers.get("x-correlation-id") || undefined,
    });
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ApiRequestError({
      status: 502,
      message: "The server returned an invalid response",
    });
  }

  return parsed as TResponse<T>;
}
