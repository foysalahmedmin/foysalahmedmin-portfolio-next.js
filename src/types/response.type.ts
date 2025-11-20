export type TResponse<T> = {
  status: number;
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type TErrorSources = {
  path: string | number;
  message: string;
}[];

export type TErrorResponse = {
  success: false;
  status: number;
  message: string;
  sources?: TErrorSources;
  error?: {
    status: number;
    name: string;
  };
  stack?: string | null;
};
