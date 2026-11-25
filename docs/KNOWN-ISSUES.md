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

## #4 — Entities and migrations still differ in naming

After a fresh `npm run migration:run`, `migration:generate --dryrun` still
proposes changes. They are names only and don't break anything at runtime:
- foreign-key constraint names (`orders_customer_id_fkey` vs TypeORM's
  generated `FK_...`)
- enum type names (`order_items.service_tier` and both
  `order_status_history` status columns reuse `orders_*_enum` in the
  migration, but the entities expect their own enum types)

Left alone because fixing it means a new migration. But until it is fixed,
`migration:generate` will keep pulling this noise into every future
migration. Fix with a dedicated migration, or by setting `enumName` and
`foreignKeyConstraintName` in the entities, before the next schema change.

Status: Open (found 2026-11-24)

## #5 — Backend lint fails on main

`npx eslint "{src,apps,libs,test}/**/*.ts"` reports 60 errors in the Stage B
module code (mostly `no-unsafe-*` in `*.service.spec.ts`, plus a few in
services/controllers). The Definition of Done requires lint to pass, so
fix this before more feature work lands on these modules.

Status: Resolved 2026-11-24 on `feat/e2e-testing` (PR #27): backend lint now
reports 0 errors.

## #6 — Public endpoints have no rate limiting

`POST /api/v1/pickups/request` and `GET /api/v1/orders/track/:orderNumber`
are public by design (the customer page). Order numbers are sequential, so
anyone can step through them. Tracking still returns the full order,
including the customer's phone and address. Add rate limiting and trim the
public tracking response to what a customer needs before go-live (roadmap
Phase 4, KNOWN-ISSUES #3).

Status: Open (found 2026-11-24)
