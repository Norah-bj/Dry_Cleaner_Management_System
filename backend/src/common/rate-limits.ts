/**
 * Request limits per client IP (security settings, not business rules).
 *
 * All shop staff usually share ONE public IP (the shop's internet line), so
 * the general limit is generous; the tight limits are on the endpoints an
 * attacker would hammer: login (password guessing) and the public customer
 * endpoints (order-number scanning, spam pickup requests).
 *
 * Disable with RATE_LIMIT_ENABLED=false (the E2E tests do, except the spec
 * that checks the limits themselves).
 */
const MINUTE = 60_000;

export const RATE_LIMITS = {
  /** Everything else, per IP. */
  general: { limit: 600, ttl: MINUTE },
  login: { limit: 10, ttl: MINUTE },
  refresh: { limit: 30, ttl: MINUTE },
  /** Public order tracking by order number. */
  publicTracking: { limit: 30, ttl: MINUTE },
  /** Public pickup requests from the customer page. */
  publicPickupRequest: { limit: 5, ttl: 10 * MINUTE },
  /** Public shop details / price list for the customer page. */
  publicRead: { limit: 60, ttl: MINUTE },
} as const;

export function rateLimitEnabled(): boolean {
  return process.env.RATE_LIMIT_ENABLED !== 'false';
}
