# EDCMS — API Conventions

## Base

- All endpoints are versioned: `/api/v1/...`
- Documented via Swagger/OpenAPI, generated from the NestJS app and kept
  current as endpoints change — updating Swagger decorators is part of the
  same change, not a follow-up.
- Auth: `Authorization: Bearer <JWT>` on every protected endpoint.
- **Implemented so far:** `POST /api/v1/auth/login` only (secure-by-default
  global guard - every other endpoint requires a valid token unless
  `@Public()`). `POST /api/v1/auth/refresh` below is the target shape, not
  yet built - see `docs/KNOWN-ISSUES.md`. The custom exception filter and
  response envelope below are the target shape too; until that
  cross-cutting phase lands, errors use NestJS's default `HttpException`
  format (`statusCode`/`message`/`error`, no `path`/`timestamp`).

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

Produced centrally by a NestJS exception filter — individual controllers do
not hand-roll error responses.

## Pagination

List endpoints accept `?page=&perPage=` and return `meta` as above. Default
`perPage` and max `perPage` are defined once in `common/` config, not
per-controller.

## Status codes

`200` read/update success, `201` created, `204` deleted with no body, `400`
validation error, `401` not authenticated, `403` not authorized, `404` not
found, `409` conflict (e.g. duplicate customer number), `422` business-rule
violation (e.g. inventory would go negative).
