# Known Issues

## #1 — No refresh-token rotation

Auth issues a single JWT access token (`JWT_EXPIRES_IN`, default 8h). No
refresh-token endpoint/rotation yet, per `docs/SECURITY.md`'s target
baseline. Users must log in again after expiry.

Status: Resolved 2026-11-25 (Phase 4): 15-minute access tokens, rotating
refresh tokens with reuse detection (`POST /auth/refresh`, `/auth/logout`).

## #2 — No user-management UI or API

The only way to create a login is `npm run seed` (creates one
`SUPER_ADMIN` from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars) or a direct
DB insert. There's no `POST /api/v1/users` endpoint or admin screen yet
to add staff accounts. Deferred to the Employees module phase (priority
#14 in `docs/design/DESIGN-SYSTEM.md`).

Status: Resolved 2026-11-24 (Phase 2): `/api/v1/users` plus the Employees
page. `npm run seed` is still used once, for the first Super Admin.

## #3 — No rate limiting or security headers yet

Listed in `docs/SECURITY.md` as required before production; not built as
of the auth phase. Also no centralized exception filter yet (errors use
NestJS's default `HttpException` format) - that's the cross-cutting
Foundation phase, not yet started.

CORS is done (`CORS_ORIGINS` env var, see `.env.example`) - resolved as
of the CORS changelog entry, no longer part of this item.

Status: Resolved 2026-11-25 (Phase 4): rate limiting (`@nestjs/throttler`),
security headers (`helmet`) and a central exception filter.

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
anyone can step through them. Since Phase 2, tracking returns only status,
totals, items and the customer's first name (no phone or address). Rate
limiting is still missing (roadmap Phase 4, KNOWN-ISSUES #3).

Status: Resolved 2026-11-25 (Phase 4): tracking is limited to 30 requests a
minute and pickup requests to 5 per 10 minutes, per IP.

## #7 — Dashboard numbers are placeholders

The dashboard's stat cards (today's orders, revenue, etc.) still show 0.
They aren't connected to real data yet. The setup checklist and the quick
buttons on the dashboard are real. Planned with Reports (roadmap Phase 5).

Status: Open (found 2026-11-24)

## #8 — Reports page shows sample data

Reports still reads browser-only sample data, marked "Preview only"
(roadmap Phase 5). Inventory became real in Phase 3 (2026-11-25).

Status: Open (found 2026-11-24)

## #9 — Cancelled orders don't return packaging to stock

Packaging taken out of stock when an order is created isn't put back if the
order is later cancelled. Until that's built, record a stock count in
Inventory to correct the level. Whether cancellation should restock depends
on the cancellation policy the client hasn't set yet (CLIENT-QUESTIONS §2).

Status: Open (found 2026-11-25)

## #10 — Rate limits are kept in memory (one server only)

The rate-limit counters live in the API process. That's correct for a single
server (the modular-monolith plan), but if EDCMS is ever run as several
copies behind a load balancer, each copy counts separately. Move the
counters to a shared store (e.g. Redis) before scaling out. Also, behind a
reverse proxy `TRUST_PROXY` must be set or every request looks like it
comes from the proxy (roadmap Phase 6).

Status: Open, by design for now (2026-11-25)

## #11 — Session tokens are kept in browser storage

The access and refresh tokens are stored in `localStorage`, same as the
access token before Phase 4. A script injected into the page (XSS) could
read them. Mitigations in place: React escapes output, access tokens last
15 minutes, refresh tokens rotate and a replayed token ends the session.
Moving the refresh token to an httpOnly cookie needs the frontend and API on
the same site, so revisit once hosting is chosen (roadmap Phase 6).

Status: Open, accepted for now (2026-11-25)
