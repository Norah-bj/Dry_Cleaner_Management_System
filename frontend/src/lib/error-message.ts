import { ApiError } from './api-client';

/**
 * Turns a failed API call into a sentence staff can act on. Pages show this
 * instead of falling back to sample data, so nobody mistakes fake orders or
 * payments for real ones when the server is unreachable.
 */
export function errorMessage(err: unknown, action = 'load this data'): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Your session has ended. Please sign in again.';
    if (err.status === 403) return `You don't have permission to ${action}.`;
    if (err.status === 404) return `Couldn't ${action}: it wasn't found.`;
    if (err.status >= 500) {
      return `Couldn't ${action} because the server had a problem. Try again, and tell the manager if it keeps happening.`;
    }
    return err.message || `Couldn't ${action}.`;
  }
  return `Couldn't ${action}: the server can't be reached. Check the connection and try again.`;
}
