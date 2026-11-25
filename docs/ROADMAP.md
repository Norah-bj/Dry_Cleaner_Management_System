# EDCMS — Roadmap to a Working Product

Status as of 2026-11-11. This file says what is left between the current
code and EBENEZER DRY CLEANER using EDCMS every day, in the order to do
it. It does not add scope: everything here is already in
`docs/requirements/REQUIREMENTS.md` (Phase 1 scope), `docs/SECURITY.md`,
or `docs/deployment/DEPLOYMENT.md`. Update the checkboxes as PRs merge.

A phase is **done** when every checkbox is ticked, its PRs are merged to
`main`, and the Definition of Done in `docs/testing/TESTING.md` holds.

## Where we are

**Built and merged to `main` (PRs #1–#24):**

- Backend foundation: NestJS, TypeORM/PostgreSQL, Swagger, health check,
  JWT auth, RBAC guards.
- Customers: backend and frontend, end to end.
- Backend modules: Orders, Laundry workflow, Payments (partial payments,
  receipts, invoices), Pickups/Deliveries/driver feed.
- Frontend: app shell, login, dashboard, and a page for every nav item.

**Built but not merged:** branch `feat/e2e-testing` (frontend wired to the
Orders/Laundry/Payments/Logistics APIs, plus E2E tests and the scenario
runner). It has no PR yet.

**Still on mock/localStorage data:** Inventory, Employees, Settings and
pricing, Reports. Several wired pages also fall back to mock data when the
API call fails.

---

## Phase 1 — Merge what's built and get client answers

Goal: `main` holds all the work that exists, and the client questions
that block later phases are in progress.

Status (2026-11-24): all work done; waiting for the owner to merge
#26 → #27 and to send the question sheet (#28).

- [ ] Run the backend against a fresh database with a real login and fix
      what breaks. PR #26: the API didn't boot, and orders, status changes
      and payments returned 500.
- [ ] Merge `feat/e2e-testing` (Stages C and D). PR #27: fake checks
      replaced with real E2E (real database) and smoke tests, fallbacks to
      sample data removed, public pickup requests fixed, backend lint at 0.
- [ ] Send the owner the questions the system can't answer by itself
      (EBM, refunds/damage, delivery area and fees, messages, existing
      records). PR #28 (`docs/requirements/CLIENT-QUESTIONS.md`).
- [ ] Record each answer in `BUSINESS-RULES.md` (with source and date)
      as it arrives.
- [ ] Update `CLAUDE.md` "Current phase" and `README.md` status (this PR).

Depends on: nothing.

## Phase 2 — Staff accounts and real configuration

Goal: the owner can create staff logins and set prices and business
details, all stored in the database.

Status (2026-11-24): built in PR #29 (stacked on #27), waiting for merge.

- [ ] Users API and admin screen: create, edit and deactivate staff,
      assign roles (closes KNOWN-ISSUES #2).
- [ ] Price list: service catalog × speed, stored in the database and
      edited from Settings.
- [ ] Orders take prices from the catalog on the server; a client-sent
      price is rejected.
- [ ] Business settings (contact, WhatsApp, hours, time windows,
      turnaround) stored in the database.
- [ ] Payment methods, material charges and discount policy chosen by the
      owner in Settings; only enabled methods are accepted.
- [ ] Employees page reads real users and roles; drivers sign in and see
      only their own jobs.

Depends on: Phase 1 merged. **No longer depends on the client's answers**
about prices, payment methods or hours: the owner enters those in Settings
(BUSINESS-RULES #10).

## Phase 3 — Inventory backend

Goal: stock is tracked in the database and cannot go negative (business
rule #6).

Status (2026-11-25): built in the Phase 3 PR, waiting for merge.

- [ ] Inventory module: items, purchase/usage/adjustment transactions,
      stock validated on the server before usage.
- [ ] Order materials (bag, cover, hangers, envelope) record usage
      against stock.
- [ ] Low-stock view and purchase history read real data.
- [ ] Inventory page moved off `mock-inventory-store`.

Depends on: Phase 2 (staff accounts for "who recorded it").

## Phase 4 — Remove mock data and harden

Goal: nothing the staff sees is fake, and the system meets
`docs/SECURITY.md`.

Status (2026-11-25): built in the Phase 4 PR, waiting for merge. The
sample-data fallbacks and the driver login were done earlier (#27, #29).
Reports keeps its sample data until Phase 5.

- [ ] Remove the mock-store fallbacks from wired pages. Show a clear
      error/offline state instead of sample data.
- [ ] Delete the `frontend/src/mock/` stores once no page imports them.
- [ ] Review every `@Public()` endpoint. The driver task feed must require
      a driver login. Public order tracking and pickup requests must
      expose only the minimum needed (business rule #8) and be rate
      limited.
- [ ] Refresh-token rotation (KNOWN-ISSUES #1).
- [ ] Rate limiting, security headers, and a central exception filter
      (KNOWN-ISSUES #3).
- [ ] Audit log for payments, order edits/cancellations, and user/role
      changes.
- [ ] Database indexes on order lookup and customer search.

Depends on: Phases 2–3 (all pages have a real backend to call).

## Phase 5 — Reports, receipts and notifications

Goal: the remaining Phase 1 features in `REQUIREMENTS.md`.

- [ ] Reports from real data: revenue, orders, payments, customers,
      inventory, pickup/delivery.
- [ ] Export to PDF, Excel and CSV.
- [ ] Printable order slip and receipt matching business rule #9.
- [ ] Notifications (order received/ready, payment, pickup/delivery
      scheduled, delivered), limited to the channels the client has.
- [ ] WhatsApp click-to-chat button with a pre-filled message (Phase 1A
      only, no Business API).
- [ ] `ebm` module as an isolated boundary. Integrate only once the
      client confirms the EBM device/software.

Depends on: Phase 4. Notifications and EBM depend on client answers.

## Phase 6 — Deployment

Goal: EDCMS runs in production, per `docs/deployment/DEPLOYMENT.md`.

- [ ] Choose hosting, decide on containers, and record the choice as an
      ADR in `docs/decisions/`.
- [ ] Production PostgreSQL, separate from dev.
- [ ] HTTPS, secrets in environment variables, production builds.
- [ ] Automated backups plus at least one tested restore.
- [ ] Logging and error monitoring.
- [ ] CI pipeline running lint, type-check and tests on every PR.
- [ ] Basic load check at the shop's expected volume.

Depends on: Phase 4 (security baseline met).

## Phase 7 — Handover and go-live

Goal: the shop is using EDCMS for real orders.

- [ ] Load real data: price list, staff accounts with roles, opening
      stock, and existing customers if the owner wants them imported.
- [ ] Short user guide per role: receptionist, cashier, laundry staff,
      driver, manager.
- [ ] Trial with the owner on a staging copy using real-looking orders;
      fix what the trial finds.
- [ ] Train the staff.
- [ ] Go live, possibly alongside the paper process for a first week
      (the owner decides).
- [ ] Agree on how bugs are reported and how backups are checked after
      launch.

Depends on: Phases 5 and 6.

---

## Out of scope

Everything under "Explicitly excluded from Phase 1" in `REQUIREMENTS.md`
stays out of this roadmap: native apps, loyalty, multi-tenant, full
WhatsApp Business API, route optimization, and so on.
