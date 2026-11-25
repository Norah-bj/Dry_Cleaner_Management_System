import {
  SESSION_ENDED_EVENT,
  clearStoredAuth,
  readStoredAuth,
  writeStoredAuth,
  type StoredAuth,
} from './auth-storage';

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

async function send(path: string, body: unknown, headers: Headers, options: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data: unknown = isJson ? await response.json() : undefined;
  return { response, data };
}

function toError(response: Response, data: unknown): ApiError {
  const raw =
    data && typeof data === 'object' && 'message' in data
      ? (data as { message: unknown }).message
      : undefined;
  const message = Array.isArray(raw) ? raw.join('. ') : raw !== undefined ? String(raw) : response.statusText;
  return new ApiError(response.status, message, data);
}

// One refresh at a time: parallel 401s all wait for the same renewal.
let refreshing: Promise<StoredAuth | null> | null = null;

/**
 * Swaps the stored refresh token for a new access/refresh pair. If another
 * tab already rotated it (our copy is stale), uses that tab's newer tokens.
 * Returns null when the session is really over.
 */
async function refreshSession(): Promise<StoredAuth | null> {
  const stored = readStoredAuth();
  if (!stored?.refreshToken) return null;
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const { response, data } = await send('/auth/refresh', { refreshToken: stored.refreshToken }, headers, { method: 'POST' });
  if (response.ok) {
    const next = data as StoredAuth;
    writeStoredAuth(next);
    return next;
  }
  const latest = readStoredAuth();
  if (latest?.refreshToken && latest.refreshToken !== stored.refreshToken) return latest;
  return null;
}

function endSession(): void {
  clearStoredAuth();
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
}

/**
 * Thin fetch wrapper: JSON in/out, attaches the bearer token unless
 * `auth: false`, renews an expired access token once using the refresh
 * token, and normalizes non-2xx responses into ApiError using the
 * backend's documented error shape (docs/architecture/API.md).
 */
export async function apiFetch<T>(
  path: string,
  { body, auth = true, headers, ...options }: ApiFetchOptions = {},
): Promise<T> {
  const build = () => {
    const h = new Headers(headers);
    h.set('Content-Type', 'application/json');
    const stored = auth ? readStoredAuth() : null;
    if (stored?.accessToken) h.set('Authorization', `Bearer ${stored.accessToken}`);
    return h;
  };

  let { response, data } = await send(path, body, build(), options);

  if (response.status === 401 && auth && readStoredAuth()) {
    // Signed in from before refresh tokens existed: nothing to renew with.
    if (!readStoredAuth()?.refreshToken) {
      endSession();
      throw toError(response, data);
    }
    refreshing ??= refreshSession().finally(() => {
      refreshing = null;
    });
    const renewed = await refreshing;
    if (!renewed) {
      endSession();
      throw toError(response, data);
    }
    ({ response, data } = await send(path, body, build(), options));
  }

  if (!response.ok) throw toError(response, data);
  return data as T;
}

/**
 * Downloads a file (e.g. a CSV export) with the same auth and token renewal
 * as apiFetch, then hands it to the browser as a download.
 */
export async function apiDownload(path: string, fallbackName: string): Promise<void> {
  const fetchFile = () => {
    const h = new Headers();
    const stored = readStoredAuth();
    if (stored?.accessToken) h.set('Authorization', `Bearer ${stored.accessToken}`);
    return fetch(`${API_URL}${path}`, { headers: h });
  };
  let response = await fetchFile();
  if (response.status === 401 && readStoredAuth()?.refreshToken) {
    refreshing ??= refreshSession().finally(() => {
      refreshing = null;
    });
    if (!(await refreshing)) {
      endSession();
      throw new ApiError(401, 'Your session has ended. Please sign in again.');
    }
    response = await fetchFile();
  }
  if (!response.ok) {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    throw toError(response, isJson ? await response.json() : undefined);
  }
  const name =
    /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Ends the server-side session too (best effort - always clears locally). */
export async function logoutSession(): Promise<void> {
  const stored = readStoredAuth();
  clearStoredAuth();
  if (!stored?.refreshToken) return;
  try {
    await send(
      '/auth/logout',
      { refreshToken: stored.refreshToken },
      new Headers({ 'Content-Type': 'application/json' }),
      { method: 'POST' },
    );
  } catch {
    // Offline: the token still expires on its own.
  }
}
