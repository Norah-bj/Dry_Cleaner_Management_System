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
  `test/logistics-driver.e2e-spec.ts`, `test/settings-staff.e2e-spec.ts`
  (settings, price list, server-side pricing, discounts, staff accounts),
  `test/inventory.e2e-spec.ts` (stock never negative, order packaging usage
  and rollback, history, low-stock list), `test/security.e2e-spec.ts`
  (refresh rotation and reuse detection, logout, sign-out on deactivation,
  security headers, error shape, audit log, rate limits).
- Rate limiting is switched off for the E2E run (`RATE_LIMIT_ENABLED=false`
  in `test/setup/e2e-env.ts`) because the tests sign in many times from one
  IP. `security.e2e-spec.ts` switches it on to test the limits themselves.

### Smoke test (`npm run test:smoke`)

Calls a running API over HTTP and checks every response. Exits with code 1
on any failure, so it can gate a deployment.

```
# needs at least one priced service and one enabled payment method in Settings
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
                        # then sign in and follow the setup checklist (section 3A)
npm run start:dev       # http://localhost:3000, Swagger at /api/docs

# terminal 2
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## 3. Manual checks in the browser

Sign in with the seeded admin. If the backend is stopped, every page must
show a red "couldn't load…" message with a **Try again** button. No page
may ever show sample orders, payments or drivers. The only exception is
Reports, which is marked "Preview only" until Phase 5.

### A. First-run setup (do this first; it's what the owner will do)

1. **Dashboard** shows "Finish setting up the shop" with a checklist.
2. **Settings → Services & Prices**: add a few items, e.g. "Shirt" with a
   Standard and an Express price, leaving Same Day empty. Edit one, then
   Hide/Show it.
3. **Settings → Payments & Charges**: tick the payment methods the shop
   accepts. Set a charge for Hanger (0 is fine) and leave Bag empty. Leave
   discounts off for now.
4. **Settings → Hours & Time Windows**: set opening hours, add two time
   windows (e.g. 08:00–10:00, 14:00–16:00) and turnaround text.
5. **Settings → Business Details**: shop phone and WhatsApp number.
6. **Employees**: add a Receptionist and a Driver, each with a starting
   password. Back on the Dashboard, the checklist is gone or nearly done.

### B. Daily work

7. **New Order**: the item list shows your prices for the chosen speed.
   Switch to Same Day: "Shirt" shows "no Same Day price" and Save is
   blocked. Switch back, add Hanger (charged) and Bag (only "customer's
   own" is allowed, at zero). The payment dropdown lists only the methods
   you ticked. Save: the slip shows the server's order number and totals.
8. Open the order: the totals match. Record part of the balance. Try paying
   more than the balance: it's refused with a clear message.
9. **Laundry**: move the order a stage; the order timeline shows it.
10. **Pickup & Delivery → Schedule Pickup**: find the customer by phone,
    pick a time window from your list, assign the driver.
    **Schedule Delivery**: find the order by number. The card shows the
    cash to collect.
11. **Discounts**: in Settings turn discounts on for Receptionist. Sign in
    as the receptionist: New Order now shows a Discount field. (With
    discounts off, the field isn't shown and the API refuses one.)

### C. Roles and the driver

12. Sign in as the **receptionist**: Employees and Settings are not in the
    menu.
13. Sign in as the **driver** (on a phone if possible): you land on the
    driver job list, which shows only that driver's jobs: name, phone,
    address, time window and cash to collect, but no prices. Tap "I'm on
    the way", then "Picked up".
14. In **Employees**, deactivate the receptionist, then try to sign in as
    them: refused. Reactivate and use "Password" to set a new one.

### D. Customer page (`/customer`, private window, not signed in)

15. The shop phone, WhatsApp button and opening hours come from Settings.
16. Track the order by number: you see the status and balance, and only the
    customer's first name.
17. Request a pickup: the time window list is yours. On success you get a
    confirmation, and the pickup appears on the staff Pickup & Delivery
    page.

### E. Inventory (owner or manager)

19. **Inventory → Add Item**: "Hangers", counted in pcs, warn at 3, in stock
    now 5, used on orders as **Hanger**.
20. Make a New Order with 3 hangers (not customer's own). Inventory now
    shows 2 and "Low", and the "Running low" box lists it. History shows
    "Used on order ORD-…".
21. Try a New Order with 5 hangers: it's refused with "Not enough Hangers
    in stock", and no order is created.
22. **Restock** 20, then a **Stock count** of 20 with a reason. History shows
    each step. Try recording usage of more than is in stock: refused.
23. Sign in as laundry staff: Inventory is visible but read-only. As a
    receptionist: Inventory isn't in the menu.

### F. Security (Phase 4)

25. **Stay signed in**: leave the app open for more than 15 minutes, then
    click around: it keeps working (the access token renews on its own).
26. **Activity Log**: Settings → Activity Log lists the payments, status
    changes, price changes and staff changes you made above, with your name.
27. **Deactivate**: sign in as a receptionist in another browser, deactivate
    them as the owner, then click something as the receptionist within 15
    minutes: once their access token expires they're sent to sign-in and
    can't get back in.
28. **Password guessing**: enter a wrong password 11 times in a minute: the
    11th attempt says too many requests.

### G. Server down

29. Stop the backend and reload pages: each shows the red error message.
    The customer page's pickup form says it couldn't send the request.
