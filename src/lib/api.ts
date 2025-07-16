import { BASE_URL } from "@/config";

// types.ts (separate file for interfaces)
export interface FetchConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface NextFetchConfig {
  cache?: string;
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

export interface RequestConfig {
  url: string;
  options: RequestInit;
}

export interface FetchResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: {
    url: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    body?: any;
    timeout?: number;
  };
}

export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
  response: Response
) => Response | Promise<Response>;

// Fetch.ts (main class)
export class Fetch {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  public interceptors = {
    request: {
      handlers: [] as RequestInterceptor[],
      use: (interceptor: RequestInterceptor) => {
        this.interceptors.request.handlers.push(interceptor);
        return this;
      },
    },
    response: {
      handlers: [] as ResponseInterceptor[],
      use: (interceptor: ResponseInterceptor) => {
        this.interceptors.response.handlers.push(interceptor);
        return this;
      },
    },
  };

  constructor(config: FetchConfig & NextFetchConfig = {}) {
    this.baseURL = config.baseURL || "";
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.headers,
    };
    this.timeout = config.timeout || 10000;
  }

  create(config: FetchConfig): Fetch {
    return new Fetch(config);
  }

  private async processRequest(config: RequestConfig): Promise<RequestConfig> {
    // Merge headers
    const mergedHeaders = {
      ...this.defaultHeaders,
      ...this.convertHeaders(config.options.headers),
    };

    let processedConfig: RequestConfig = {
      ...config,
      options: {
        ...config.options,
        headers: mergedHeaders,
      },
    };

    // Apply request interceptors
    for (const interceptor of this.interceptors.request.handlers) {
      processedConfig = await interceptor(processedConfig);
    }

    return processedConfig;
  }

  private async processResponse<T>(
    response: Response,
    config: RequestConfig
  ): Promise<FetchResponse<T>> {
    // Apply response interceptors
    let processedResponse = response;
    for (const interceptor of this.interceptors.response.handlers) {
      processedResponse = await interceptor(processedResponse);
    }

    if (!processedResponse.ok) {
      const error = new Error(
        `HTTP error! status: ${processedResponse.status}`
      );
      (error as any).response = processedResponse;
      throw error;
    }

    // Process response headers
    const responseHeaders = this.convertHeaders(processedResponse.headers);

    // Parse data based on content type
    const contentType = processedResponse.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await processedResponse.json()
      : await processedResponse.text();

    return {
      data: data as T,
      status: processedResponse.status,
      statusText: processedResponse.statusText,
      headers: responseHeaders,
      config: {
        url: config.url,
        method: config.options.method,
        baseURL: this.baseURL,
        headers: this.convertHeaders(config.options.headers),
        body: config.options.body,
        timeout: this.timeout,
      },
    };
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  private convertHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
      const obj: Record<string, string> = {};
      headers.forEach((v, k) => (obj[k] = v));
      return obj;
    }
    if (Array.isArray(headers)) return Object.fromEntries(headers);
    return headers;
  }

  async request<T = any>(
    url: string,
    options: RequestInit & NextFetchConfig = {}
  ): Promise<FetchResponse<T>> {
    const processedConfig = await this.processRequest({
      url,
      options,
    });

    const fullUrl = this.baseURL + processedConfig.url;
    const response = await this.fetchWithTimeout(
      fullUrl,
      processedConfig.options
    );

    return this.processResponse<T>(response, processedConfig);
  }

  // HTTP verb methods remain the same...
  get<T = any>(url: string, options?: RequestInit): Promise<FetchResponse<T>> {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  post<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, "body">
  ): Promise<FetchResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  put<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, "body">
  ): Promise<FetchResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  patch<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, "body">
  ): Promise<FetchResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  delete<T = any>(
    url: string,
    options?: RequestInit
  ): Promise<FetchResponse<T>> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}

const api = new Fetch({ baseURL: BASE_URL });

export default api;
