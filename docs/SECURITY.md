# EDCMS — Security Baseline

This is a real business system handling customer data and payments. Minimum
bar, all required before Phase 1 is considered production-ready:

**Status as of Phase 4 (2026-11-25):** all items below are implemented:
password hashing (argon2); 15-minute JWT access tokens with rotating refresh
tokens (only a SHA-256 hash is stored; a replayed token revokes that whole
session; deactivation or a password reset signs the user out everywhere);
server-side authorization (global `JwtAuthGuard` + `RolesGuard`); DTO
validation; CORS restriction; per-IP rate limiting (tight on login and the
public customer endpoints, `src/common/rate-limits.ts`); security headers
(helmet); a central exception filter that never leaks stack traces or SQL;
and an append-only audit log. Known trade-offs: KNOWN-ISSUES #10 (in-memory
rate limits) and #11 (tokens in browser storage). Don't assume anything
below is done just because it's listed here; this file is the target
bar, not a status report.

- Passwords hashed with Argon2 or bcrypt — never plaintext, never reversibly
  encrypted.
- JWT-based authentication with a refresh strategy; short-lived access
  tokens.
- Authorization is enforced server-side via guards on every protected
  endpoint — **authentication is not authorization**; a logged-in driver
  must not be able to read another customer's payment history just because
  they're logged in.
- Input validation on every endpoint (DTOs + `class-validator`), rejecting
  unexpected fields.
- Parameterized queries only (TypeORM handles this by default — never
  string-concatenate SQL).
- Rate limiting on auth endpoints and any public-facing endpoint (WhatsApp
  click-to-chat landing, etc.).
- CORS restricted to known frontend origins, not `*`.
- Secure HTTP headers (helmet or equivalent).
- Audit log for sensitive mutations: status changes, payments, order
  edits/cancellations, user/role changes.
- Secrets (`JWT_SECRET`, DB credentials, WhatsApp/Maps/EBM keys) live only
  in environment variables, never committed. `.env.example` documents the
  required keys with placeholder values.
- File uploads (if/when introduced) validated for type and size, stored
  outside the web root or in object storage — never trusted by extension
  alone.
- No sensitive data (passwords, tokens, full card numbers) in logs.
- Dependency versions kept current; don't add a dependency with known
  unpatched vulnerabilities.

## Explicitly forbidden

- Hardcoded credentials or secrets anywhere in the repo.
- Disabling auth/validation "temporarily" to unblock a demo.
- Logging full request bodies on auth or payment endpoints.
