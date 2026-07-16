export type TMeta = {
  page: number;
  limit: number;
  total: number;
  totalPage?: number;
  statistics?: Record<string, number>;
};

export type TResponse<T> = {
  status: number;
  success: boolean;
  message?: string;
  data: T;
  meta?: TMeta;
};

export type TErrorSources = {
  path: string | number;
  message: string;
}[];

export type TErrorResponse = {
  success: false;
  status: number;
  code?: string;
  message: string;
  sources?: TErrorSources;
  current_version?: number;
  correlation_id?: string;
  error?: {
    status: number;
    name: string;
  };
  stack?: string | null;
};
