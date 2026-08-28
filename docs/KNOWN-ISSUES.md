# Known Issues

## #1 — No refresh-token rotation

Auth issues a single JWT access token (`JWT_EXPIRES_IN`, default 8h). No
refresh-token endpoint/rotation yet, per `docs/SECURITY.md`'s target
baseline. Users must log in again after expiry.

Status: Planned (before production, per docs/deployment/DEPLOYMENT.md)

## #2 — No user-management UI or API

The only way to create a login is `npm run seed` (creates one
`SUPER_ADMIN` from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars) or a direct
DB insert. There's no `POST /api/v1/users` endpoint or admin screen yet
to add staff accounts. Deferred to the Employees module phase (priority
#14 in `docs/design/DESIGN-SYSTEM.md`).

Status: Planned

## #3 — No rate limiting or security headers yet

Listed in `docs/SECURITY.md` as required before production; not built as
of the auth phase. Also no centralized exception filter yet (errors use
NestJS's default `HttpException` format) - that's the cross-cutting
Foundation phase, not yet started.

CORS is done (`CORS_ORIGINS` env var, see `.env.example`) - resolved as
of the CORS changelog entry, no longer part of this item.

Status: Planned
