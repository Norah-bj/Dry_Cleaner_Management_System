import { readStoredAuth } from './auth-storage';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip attaching the Authorization header (e.g. login itself). */
  auth?: boolean;
}

/**
 * Thin fetch wrapper: JSON in/out, attaches the bearer token unless
 * `auth: false`, and normalizes non-2xx responses into ApiError using
 * the backend's error message when present (see docs/architecture/API.md
 * - the backend doesn't have its custom error envelope yet, so this
 * reads NestJS's default HttpException shape).
 */
export async function apiFetch<T>(
  path: string,
  { body, auth = true, headers, ...options }: ApiFetchOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');

  if (auth) {
    const stored = readStoredAuth();
    if (stored?.accessToken) {
      requestHeaders.set('Authorization', `Bearer ${stored.accessToken}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');
  const data = isJson ? await response.json() : undefined;

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : undefined) ?? response.statusText;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
