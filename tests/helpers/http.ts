import { NextRequest } from "next/server";

const TEST_ORIGIN = "http://localhost:3000";

type RequestBody = Record<string, unknown> | readonly unknown[];

type TestRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: RequestBody;
  cookies?: Readonly<Record<string, string>>;
  headers?: HeadersInit;
};

const serializeCookies = (cookies: Readonly<Record<string, string>>): string =>
  Object.entries(cookies)
    .map(
      ([name, value]) =>
        `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
    )
    .join("; ");

export const createTestRequest = (
  path: string,
  {
    body,
    cookies = {},
    headers: initialHeaders,
    ...init
  }: TestRequestOptions = {}
): NextRequest => {
  const headers = new Headers(initialHeaders);
  const { signal, ...requestInit } = init;

  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }

  if (Object.keys(cookies).length > 0) {
    headers.set("cookie", serializeCookies(cookies));
  }

  return new NextRequest(new URL(path, TEST_ORIGIN), {
    ...requestInit,
    signal: signal ?? undefined,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
};

export const readJsonResponse = async <T>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Expected an application/json response.");
  }

  return (await response.json()) as T;
};
