# EDCMS — Architecture

Status: Phase 0 design, no code exists yet. This is the blueprint Phase 1
implementation must follow. Changes to anything in this file require an ADR
in `docs/decisions/`.

## System overview

```
                         EDCMS
                           |
          +----------------+----------------+
          |                |                |
       STAFF            DRIVER           CUSTOMER
       PC/Web          Phone/Web         Phone/Web
          |                |                |
          +----------------+----------------+
                           |
                           v
                  React + TypeScript
                     (responsive UI)
                           |
                        REST API
                           |
                           v
                  NestJS + TypeScript
                  (modular monolith)
                           |
        +------------------+------------------+
        |                  |                  |
      Modules           Services          Security
        |                  |                  |
        +------------------+------------------+
                           |
                           v
                      PostgreSQL
                           |
             +-------------+-------------+
             |             |             |
           Redis        Storage      External APIs
                          (files)          |
                                   +-------+--------+
                                   |       |        |
                                WhatsApp  Maps     EBM
```

- Frontend never talks to PostgreSQL directly — only through the REST API.
- Redis and file storage are added when a concrete feature needs them
  (sessions/queues, uploaded documents), not preemptively.
- WhatsApp, Maps, and EBM are external integrations, each isolated behind
  its own backend module so a missing/changed integration doesn't leak into
  core business logic.

## Backend: modular monolith

One NestJS application, one deployable unit, organized by business domain
module — not microservices.

```
backend/
  src/
    app.module.ts
    config/
    common/
      decorators/ guards/ filters/ interceptors/ pipes/ middleware/ utils/
    database/
    modules/
      auth/
      users/
      customers/
      employees/
      services/
      orders/
      laundry/
      payments/
      invoices/
      pickups/
      deliveries/
      inventory/
      notifications/
      reports/
      whatsapp/
      ebm/
      audit/
    main.ts
```

No separate `roles/` module: the six roles in
`docs/requirements/REQUIREMENTS.md` §26 are a fixed enum on the `User`
entity (`modules/users/entities/user.entity.ts`), not a database-driven
roles/permissions table. Revisit only if dynamic role management becomes
an actual requirement — don't build that ahead of need.

Each module owns its controller, service, entities, DTOs, and tests:

```
orders/
  orders.module.ts
  orders.controller.ts
  orders.service.ts
  entities/order.entity.ts
  dto/create-order.dto.ts
  dto/update-order.dto.ts
  tests/
```

Rules:
- Controllers stay thin — validation via DTOs, business logic in services.
- Cross-module access goes through the other module's exported service, not
  direct entity/repository reach-through.
- No module may be split into a separate deployable service without an ADR.

## Frontend

Visual direction, design tokens, component inventory, and page-by-page UX
are specified in [docs/design/DESIGN-SYSTEM.md](../design/DESIGN-SYSTEM.md)
and [docs/design/PAGES.md](../design/PAGES.md) — this section covers
folder structure only.

```
frontend/
  src/
    app/
    components/
      ui/            # generic primitives: Button, Card, Badge, EmptyState, ...
      orders/        # domain-specific reusable pieces: OrderCard, ...
      customers/     # CustomerCard, ...
      payments/      # PaymentSummary, ...
      inventory/     # InventoryAlert, ...
    layouts/
    routes/
    hooks/
    lib/
    services/        # API client calls
    types/
    features/
      auth/ customers/ orders/ payments/ pickups/ deliveries/
      inventory/ employees/ reports/ dashboard/ laundry/ settings/
    main.tsx
```

`features/<domain>/` holds the route-level page component for that
domain. `components/<domain>/` holds pieces reused by *more than one*
page — extract into it the moment a second consumer appears, not
preemptively. `components/ui/` stays domain-agnostic.

Three UI experiences from one app, gated by role/route:
- **Staff** — desktop-first: dashboard, customers, orders, laundry,
  payments, pickup, delivery, inventory, employees, reports, settings.
- **Driver** — mobile-first, deliberately minimal: today's pickups/
  deliveries, request detail, status action buttons only.
- **Customer** — mobile-first: WhatsApp order button, request pickup, basic
  order info, contact.

## Cross-cutting concerns

- **Auth:** JWT access tokens (`modules/auth`), a global `JwtAuthGuard`
  (secure by default - every endpoint requires a valid token unless
  explicitly marked `@Public()`) plus a `RolesGuard` driven by `@Roles()`.
  A refresh-token strategy is not yet implemented - access tokens are
  short-lived (`JWT_EXPIRES_IN`, default 8h) as an interim measure; see
  `docs/KNOWN-ISSUES.md`.
- **Validation:** `class-validator`/`class-transformer` DTOs on every
  endpoint, enforced globally via `ValidationPipe` (whitelist,
  forbid-non-whitelisted, auto-transform) in `main.ts`.
- **Error handling:** centralized exception filters on the backend;
  frontend must handle loading/success/empty/error/unauthorized/forbidden/
  validation-failure/network-failure states explicitly.
- **Audit logging:** sensitive mutations (status changes, payments, order
  edits) write to the `audit` module.
- **API docs:** Swagger/OpenAPI generated from the NestJS app, served at
  `/api/docs` (outside the `/api/v1` prefix), kept in sync with
  `docs/architecture/API.md` conventions.

## Integrations (isolated modules)

- **WhatsApp:** Phase 1A = click-to-chat link only. Business API is a later
  phase behind the same `whatsapp` module boundary.
- **Maps:** store lat/lng on customers and pickup/delivery requests; no live
  tracking or routing in Phase 1.
- **EBM:** module boundary exists; implementation blocked on client
  discovery (see REQUIREMENTS.md open questions). Do not implement against
  assumptions about the EBM device/API.
