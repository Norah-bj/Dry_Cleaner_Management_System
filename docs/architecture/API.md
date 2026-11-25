# EDCMS — API Conventions

## Base

- All endpoints are versioned: `/api/v1/...`
- Documented via Swagger/OpenAPI, generated from the NestJS app and kept
  current as endpoints change — updating Swagger decorators is part of the
  same change, not a follow-up.
- Auth: `Authorization: Bearer <JWT>` on every protected endpoint.
- **Implemented so far:**
  - `POST /api/v1/auth/login` (Auth)
  - `GET/POST /api/v1/customers`, `GET/PATCH /api/v1/customers/:id` (Customers)
  - `POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id`, `PATCH /api/v1/orders/:id`, `PATCH /api/v1/orders/:id/status`, `GET /api/v1/orders/track/:orderNumber` (Orders & Intake)
  - `GET /api/v1/laundry/board`, `GET /api/v1/laundry/metrics` (Laundry Kanban & Metrics)
  - `POST /api/v1/orders/:orderId/payments`, `GET /api/v1/payments`, `GET /api/v1/payments/summary`, `GET /api/v1/orders/:orderId/payments` (Payments & Invoices)
  - `GET/POST /api/v1/pickups`, `GET/PATCH /api/v1/pickups/:id` (Pickups)
  - `GET/POST /api/v1/deliveries`, `GET/PATCH /api/v1/deliveries/:id` (Deliveries)
  - `GET /api/v1/drivers/:driverId/tasks` (Driver Mobile Feed)

## Resource naming

Standard REST, resource-oriented, no verb-in-path endpoints (no `/doStuff`):

```
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PATCH  /api/v1/customers/:id

GET    /api/v1/orders
POST   /api/v1/orders
GET    /api/v1/orders/:id
PATCH  /api/v1/orders/:id
POST   /api/v1/orders/:id/payments
PATCH  /api/v1/orders/:id/status

GET    /api/v1/pickups
POST   /api/v1/pickups
PATCH  /api/v1/pickups/:id

GET    /api/v1/deliveries
POST   /api/v1/deliveries
PATCH  /api/v1/deliveries/:id

POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

Sub-resources (`/orders/:id/payments`) are used when the action is scoped to
a specific parent, rather than a generic action endpoint.

## Implemented endpoints (as of Phase 2)

Swagger at `/api/docs` is the full reference; this is the map. "Public" =
no login. Every other endpoint needs a JWT; roles are listed where they
are restricted.

| Endpoint | Who | Notes |
|---|---|---|
| `POST /auth/login` | public, 10/min per IP | Returns a 15-minute `accessToken`, a `refreshToken` and the user. |
| `POST /auth/refresh` | public, 30/min per IP | Body `{ refreshToken }`. Single use: returns a new pair. Replaying a used token revokes that session. |
| `POST /auth/logout` | public | Body `{ refreshToken }`. Ends that session (204). |
| `GET/POST/PATCH /customers…` | staff (create/edit: owner, manager, receptionist, cashier) | |
| `POST /orders` | owner, manager, receptionist, cashier | Lines send `serviceItemId` + `quantity`; **the server prices them** from the price list at the order's speed. Material charges come from Settings. A client-sent price is rejected (400). |
| `PATCH /orders/:id` | owner, manager, receptionist | Discount follows the Settings discount policy. |
| `PATCH /orders/:id/status` | staff | Logged with who and when. |
| `GET /orders/track/:orderNumber` | public, 30/min per IP | Returns status, totals, balance, items and the customer's **first name only**. No phone or address. |
| `POST /orders/:orderId/payments` | owner, manager, receptionist, cashier | Method must be enabled in Settings; amount may not exceed the balance. |
| `GET /payments`, `GET /payments/summary` | staff | |
| `POST /pickups` | owner, manager, receptionist | Staff scheduling for an existing customer. |
| `POST /pickups/request` | public, 5 per 10 min per IP | Customer page: name/phone/address; server reuses or registers the customer; returns only the reference. |
| `PATCH /pickups/:id`, `PATCH /deliveries/:id` | staff; drivers only on **their own** jobs and only `status`/`notes` | `assignedDriverId` must be an active driver login; the name is taken from the account. |
| `POST /deliveries` | owner, manager, receptionist | |
| `GET /drivers/me/tasks` | driver | The signed-in driver's jobs: no prices, totals or payment status (business rule #8). |
| `GET /drivers/:driverId/tasks` | owner, manager, receptionist | Dispatcher view. |
| `GET /settings` | staff | |
| `PATCH /settings` | owner, manager | Partial update (one section at a time). |
| `GET /settings/setup-status` | owner, manager | First-run checklist. |
| `GET /settings/public` | public, 60/min per IP | Name, phone, WhatsApp, address, hours, time windows, turnaround. |
| `GET /catalog/items` | staff | `?includeInactive=true` includes hidden items. |
| `POST /catalog/items`, `PATCH /catalog/items/:id` | owner, manager | Items are hidden (`isActive: false`), never deleted. Duplicate name = 409. |
| `GET /catalog/public` | public, 60/min per IP | Active price list. |
| `GET /users`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password` | owner, manager | Only a Super Admin can grant or change the Super Admin role. Nobody can deactivate themselves or change their own role; the last active Super Admin can't be removed. |
| `GET /audit-logs` | owner, manager | Newest first; `?entityType=payment|order|user|price_list|settings|inventory`. Entries are never edited or deleted. |
| `GET /users/drivers` | owner, manager, receptionist, cashier | Active drivers, for assignment. |
| `GET /inventory/items`, `GET /inventory/items/:id`, `GET /inventory/summary`, `GET /inventory/transactions` | owner, manager, laundry staff | Items carry a computed `status` (GOOD/LOW/OUT); `?status=LOW` lists the alert items. |
| `POST /inventory/items`, `PATCH /inventory/items/:id` | owner, manager | Optional `openingStock` on create. Quantity is never edited directly. Hidden, never deleted. |
| `POST /inventory/items/:id/transactions` | owner, manager | `PURCHASE`/`USAGE` with `quantity`; `ADJUSTMENT` with `countedQuantity` + required `notes`. Anything that would go below zero is refused (400). |

## Every endpoint must have

- Authentication (unless explicitly public, e.g. login).
- Authorization (role/permission check via guard).
- Request validation (DTO with `class-validator`).
- A consistent response shape.
- A consistent error shape with the correct HTTP status code.
- Tests covering at least: happy path, validation failure, unauthorized,
  forbidden.

## Response envelope

```json
{
  "data": { ... },
  "meta": { "page": 1, "perPage": 20, "total": 134 }
}
```

`meta` is present only on paginated list endpoints.

## Error shape

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "amount must be a positive number",
  "path": "/api/v1/orders/123/payments",
  "timestamp": "2026-08-26T10:00:00.000Z"
}
```

Produced centrally by a NestJS exception filter (`src/common/filters/all-exceptions.filter.ts`).
Unexpected errors return only "Internal server error" (details are logged on
the server). Database constraint violations become 409/400, not 500. Too many
requests return 429 in the same shape. Every response also carries
`X-RateLimit-*` headers.

## Pagination

List endpoints accept `?page=&perPage=` and return `meta` as above. Default
`perPage` and max `perPage` are defined once in `common/` config, not
per-controller.

## Status codes

`200` read/update success, `201` created, `204` deleted with no body, `400`
validation error, `401` not authenticated, `403` not authorized, `404` not
found, `409` conflict (e.g. duplicate customer number), `422` business-rule
violation (e.g. inventory would go negative).
