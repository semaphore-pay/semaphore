import type { NombaEnvironment, NombaErrorResponse } from "./nomba.types";

const BASE_URLS: Record<NombaEnvironment, string> = {
  production: "https://api.nomba.com",
  sandbox: "https://sandbox.nomba.com",
};

export class NombaApiError extends Error {
  public readonly httpStatus: number;
  public readonly code?: string;
  public readonly body: unknown;

  constructor(message: string, httpStatus: number, code?: string, body?: unknown) {
    super(message);
    this.name = "NombaApiError";
    this.httpStatus = httpStatus;
    this.code = code;
    this.body = body;
  }
}

export interface NombaHttpClientOptions {
  accountId: string;
  environment?: NombaEnvironment;
  /** Supplies a fresh access token for each request. */
  getAccessToken: () => Promise<string>;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip the automatic `code === "00"` success check (some endpoints use different envelopes). */
  skipCodeCheck?: boolean;
}

/**
 * Thin fetch wrapper shared by every Nomba resource client. Handles base URL
 * selection, auth/accountId headers, query string building, and consistent
 * error handling (checks HTTP status AND the `code` field in the response body,
 * since Nomba returns HTTP 200 for some non-success responses).
 */
export class NombaHttpClient {
  private readonly baseUrl: string;
  private readonly accountId: string;
  private readonly getAccessToken: () => Promise<string>;

  constructor(options: NombaHttpClientOptions) {
    this.baseUrl = BASE_URLS[options.environment ?? "production"];
    this.accountId = options.accountId;
    this.getAccessToken = options.getAccessToken;
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = this.buildUrl(path, options.query);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          accountId: this.accountId,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      throw new NombaApiError(
        `Network error calling Nomba API (${method} ${path}): ${(error as Error).message}`,
        0
      );
    }

    let parsed: unknown;
    const text = await response.text();
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      const errBody = parsed as NombaErrorResponse | undefined;
      throw new NombaApiError(
        errBody?.description ?? `Nomba API request failed with status ${response.status}`,
        response.status,
        errBody?.code,
        parsed
      );
    }

    // Nomba can return HTTP 200/201 with a non-success `code` (e.g. transfers
    // that return 201/PENDING_BILLING). Callers that need to inspect that
    // themselves (e.g. the transfer endpoint) should pass skipCodeCheck.
    if (!options.skipCodeCheck && parsed && typeof parsed === "object" && "code" in parsed) {
      const envelope = parsed as { code: string; description?: string; data?: unknown };
      if (envelope.code !== "00" && response.status === 200) {
        throw new NombaApiError(
          envelope.description ?? `Nomba API returned error code ${envelope.code}`,
          response.status,
          envelope.code,
          parsed
        );
      }
      return (envelope.data ?? parsed) as T;
    }

    return parsed as T;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  delete<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, body, options);
  }
}