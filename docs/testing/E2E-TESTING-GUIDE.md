# EDCMS — How to Test

Every automated check below talks to real code. None of them pass on their
own: if the behaviour breaks, they fail.

## 1. Automated checks

Run from `backend/` unless noted. You need PostgreSQL running and
`backend/.env` filled in (see `.env.example`).

| Command | What it proves | Needs |
|---|---|---|
| `npm test` | Service logic (totals, balances, status rules) with mocked repositories | nothing |
| `npm run test:e2e` | The whole API against a **real database** with **real logins and roles**: orders, status history, payments, invoices, pickups, deliveries, public pickup requests | PostgreSQL |
| `npm run test:smoke` | A running server (local, staging or production) handles the full order journey | the API running |
| `npm run lint` / `npm run build` | No lint errors; the TypeScript compiles | nothing |
| `cd ../frontend && npm run lint && npm run build` | Frontend lint and type-check, production bundle builds | nothing |

### E2E tests (`npm run test:e2e`)

- Boots the real `AppModule` with the same prefix, CORS and validation as
  production (`src/configure-app.ts`), against a separate database,
  `edcms_e2e` by default (override with `E2E_DATABASE_NAME`).
- Creates that database if needed and runs every migration first, so a
  migration that doesn't match the entities fails the suite.
- **Empties every table before each spec file.** As a safety guard it
  refuses to run unless the database name ends in `_e2e` or `_test`, so it
  can never wipe your dev or production data.
- Specs: `test/app.e2e-spec.ts` (health, login, roles),
  `test/orders-lifecycle.e2e-spec.ts`, `test/payments-invoicing.e2e-spec.ts`,
  `test/logistics-driver.e2e-spec.ts`.

### Smoke test (`npm run test:smoke`)

Calls a running API over HTTP and checks every response. Exits with code 1
on any failure, so it can gate a deployment.

```
# local server on the default port, using ADMIN_EMAIL / ADMIN_PASSWORD from .env
npm run test:smoke

# any other server
SMOKE_API_URL=https://your-server SMOKE_EMAIL=... SMOKE_PASSWORD=... npm run test:smoke
```

It **creates real records** (a customer called "SMOKE TEST …", an order,
payments, pickups and a delivery). Use it on dev or staging, or on
production only if you're happy to keep those records.

## 2. Run the app locally

```
# terminal 1
cd backend
npm install
npm run migration:run
npm run seed            # first SUPER_ADMIN from ADMIN_EMAIL / ADMIN_PASSWORD
npm run start:dev       # http://localhost:3000, Swagger at /api/docs

# terminal 2
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## 3. Manual checks in the browser

Sign in with the seeded admin. If the backend is stopped, every page must
show a red "couldn't load…" message with a **Try again** button. No page
may ever show sample orders, payments or drivers.

1. **New order.** Orders → New Order. The form starts empty. Add a
   customer, garments and materials, then confirm. The slip shows an order
   number like `ORD-2026-00001`; open the order and check the totals match.
2. **Laundry.** Laundry board → move the order a stage. Open the order:
   the timeline shows the change.
3. **Payments.** On the order, record part of the balance. Payments page:
   the order appears under Outstanding with the remaining balance. Pay the
   rest: it leaves Outstanding.
4. **Pickup and delivery.** Pickup & Delivery shows pickups and deliveries
   from the database. Advance one.
5. **Customer page.** Open `/customer` in a private window (not signed in).
   Track the order by its number. Submit a pickup request: you see a
   confirmation only if the server saved it; the pickup then appears on
   the staff Pickup & Delivery page.
6. **Server down.** Stop the backend and reload each page: each shows the
   red error message, and the customer page's pickup form says it couldn't
   send the request.
