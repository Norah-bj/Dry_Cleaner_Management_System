# Changelog

## 2026-08-26

**Phase:** 0 — Discovery

Created the initial documentation scaffold for EDCMS: `CLAUDE.md`
(engineering rules for AI-assisted development), requirements, business
rules, architecture, database ERD, API conventions, initial ADRs
(NestJS+TypeScript, TypeORM, PostgreSQL, modular monolith), testing
strategy, and security baseline.

No application code exists yet. Repository was confirmed empty before this
work — there was no prior implementation to audit or migrate.

Next: confirm open questions in `docs/requirements/REQUIREMENTS.md` with
the client where possible, then begin Phase 1 (Foundation) — project
scaffolding for `frontend/` and `backend/`.

Added `.github/PULL_REQUEST_TEMPLATE.md` and a "Git & PR workflow" section
in `CLAUDE.md`: every change goes on its own branch and is handed off as a
PR (via `gh pr create`) for the owner to review and merge herself — no
direct commits to `main`, and the agent never merges a PR.

**Phase:** 1 — Foundation (backend scaffold)

Scaffolded the NestJS backend (`backend/`) per `docs/architecture/ARCHITECTURE.md`:
`config/`, `database/`, `common/{decorators,guards,filters,interceptors,pipes,middleware,utils}`,
and an empty `modules/` ready for business domains. Wired `ConfigModule`
(fails fast if required `DATABASE_*` env vars are missing), `TypeOrmModule`
against PostgreSQL with `synchronize: false` (migrations only, per
`docs/architecture/DATABASE.md`), a TypeORM CLI `data-source.ts` plus
`migration:generate|create|run|revert` npm scripts, and a `/health` endpoint
(`@nestjs/terminus`) that pings the database.

Verified: `npm run build`, `npm run lint`, and `npm test` all pass. Booted
the app locally with `npm run start:dev` against a real local Postgres —
config loading and the DB connection/retry path both work correctly (the
smoke test surfaced a genuine `password authentication failed`, i.e. wiring
is correct, actual local DB credentials are an environment/setup detail).

**Note:** `typeorm`'s `latest` npm dist-tag is now a `1.x` line (installed
`1.1.0`); the `0.3.x` line is tagged `legacy`. This postdates the original
planning notes, which assumed the familiar `0.3.x` API. `@nestjs/typeorm`
resolved `1.1.0` on its own and everything here builds/runs against it, but
flagging it since some TypeORM docs/examples found online will still be for
`0.3.x`.

No business modules yet — customers/orders/etc. are later phases.

## 2026-08-26 (cont'd)

**Phase:** 1 — Foundation (frontend design direction)

Added `docs/design/DESIGN-SYSTEM.md`: the confirmed frontend design
direction — "The Clean Journey" concept (garment-journey progress motif
as the signature UI element), color/typography/spacing tokens, navigation
IA, the design-system component inventory, condensed page-by-page UX
direction, and the 17-step build priority order (design system → app
shell → auth → dashboard → ... → driver/customer mobile). Linked from
`CLAUDE.md`, `README.md`, and `ARCHITECTURE.md`.

No frontend code yet — this is the spec the frontend scaffold and all
subsequent frontend PRs build against.

## 2026-08-26 (cont'd, 2)

**Phase:** 1 — Foundation (frontend scaffold)

Scaffolded `frontend/` (Vite + React 19 + TypeScript) and wired it to
`docs/design/DESIGN-SYSTEM.md`: Tailwind CSS v4 (CSS-first `@theme` in
`src/styles/tokens.css`) generates real utility classes from our actual
color/font/radius/shadow tokens, Inter loaded via Google Fonts, and three
base primitives (`Button`, `Card`, `Badge`, via `class-variance-authority`
+ a `cn()` clsx/tailwind-merge helper) prove the tokens work end to end.
Also wired `react-router-dom` and `@tanstack/react-query` providers in
`main.tsx`, and laid out the rest of the folder structure from
`docs/architecture/ARCHITECTURE.md` (`app/`, `layouts/`, `hooks/`,
`services/`, `types/`, and empty `features/*` for each business domain).

`App.tsx` currently renders a temporary `SetupCheck` page (not a real
feature) that exercises the primitives/tokens — to be replaced once the
real app shell/navigation phase starts, per the priority order in
DESIGN-SYSTEM.md.

Verified: `npm run build` and `npm run lint` (oxlint — ships by default
with the current Vite scaffold, so used as-is rather than swapping in
ESLint) both pass; confirmed the compiled CSS actually contains our token
values (e.g. `#1f8a70` under `bg-primary`); served the production build
and got a 200 with the expected HTML/asset references. Could not do an
actual visual/browser check — no browser automation tool available in
this environment. Recommend opening it in a real browser before merging.

**Note:** several installed package majors are newer than commonly
documented online as of this session — React 19.2, Vite 8, Tailwind CSS 4
(CSS-first `@theme` config, not the old `tailwind.config.js` + `@tailwind`
directives), TypeScript ~6.0, and the Vite scaffold now ships `oxlint`
instead of ESLint by default. Worth knowing if debugging against older
tutorials/docs.

No real pages yet — the app shell/navigation phase is next, per
DESIGN-SYSTEM.md's build priority order.

## 2026-08-26 (cont'd, 3)

**Phase:** 1 — Foundation (staff app shell + navigation)

Built the staff app shell per DESIGN-SYSTEM.md priority item #2:
`src/layouts/AppShell.tsx` (desktop sidebar grouped Operations/Business/
Insights/System, collapsible; topbar; mobile bottom nav) and
`src/layouts/nav-config.ts` (single source of truth for both). Every nav
destination routes to a real page via React Router — most render a
`ComingSoon` placeholder (navigation is real, the feature isn't built
yet), which replaces the temporary `SetupCheck` page from the previous
phase.

**Interpretive call worth flagging:** DESIGN-SYSTEM.md's mobile bottom
nav is `Home · Orders · Jobs · More` without defining "Jobs" further.
Implemented "Jobs" as the Laundry board (the doc's primary "what do I
need to work on" view) and moved Pickup & Delivery into "More" on
mobile, alongside Customers/Payments/Inventory/Reports/Employees/
Settings. Flagged in the PR for confirmation; easy to change if wrong.

No route protection yet (auth/RBAC is next), and the topbar search/
notifications are visually present but disabled — not wired to fake
functionality, since there's no backend to query yet.

Verified: `npm run build` and `npm run lint` pass; served the production
build and confirmed both `/` and a nested route (`/orders`) return 200
via the SPA fallback. No visual/browser check possible (same tooling
limitation as the previous entry).

## 2026-08-27

**Phase:** 1 — Foundation (sidebar refinement)

Reworked the desktop sidebar based on a reference layout the owner
shared: group labels changed from uppercase/tracking-wide to plain
title case; the collapse toggle moved from a sidebar footer button into
the header row (`PanelLeftClose`/`PanelLeftOpen`); and a new
`UserMenu.tsx` anchors user identity to the bottom of the sidebar
(avatar, name/role placeholder, and a popover with "Profile & Settings"
— a real link to `/settings` — and a disabled "Log out", since there's
no auth session yet to end). Removed the now-redundant plain "Staff"
label from the topbar.

Verified: `npm run build` and `npm run lint` pass; served the production
build and confirmed `/`, `/orders`, and `/settings` all return 200. No
visual/browser check possible (no browser tool in this environment) —
please look at it in `npm run dev` before merging.

## 2026-08-27 (cont'd)

**Phase:** 1 — Foundation (sidebar polish)

Fixed a bug in `UserMenu`'s popover: it was width-bound to the sidebar's
own width (`inset-x-3`), so in the collapsed (icon-only) state the menu
rendered at ~40px wide with wrapped, unreadable text. Now uses a fixed
`w-56` anchored to the sidebar's left edge regardless of collapsed state.
Also added a hover tooltip on the collapsed trigger and a chevron that
flips when the menu is open, so it reads as clickable in both states.

## 2026-08-27 (cont'd, 2)

**Phase:** 1 — Foundation (backend authentication)

Added JWT authentication and RBAC to the backend, priority item #3 in
`docs/design/DESIGN-SYSTEM.md`:

- `modules/users` — `User` entity (email, argon2 password hash, full
  name, fixed `role` enum, active flag) and a service for lookups/creation.
  **No separate `roles`/`permissions` module** - the six roles from
  `docs/requirements/REQUIREMENTS.md` are a fixed enum column, not a
  dynamic table; `ARCHITECTURE.md` and `DATABASE.md` updated to match.
- `modules/auth` — `POST /api/v1/auth/login` (validates credentials,
  issues a JWT), `JwtStrategy`, and DTO validation on the request body.
- `common/guards` — `JwtAuthGuard` applied **globally** (secure by
  default: every endpoint requires a valid token unless marked
  `@Public()`) and a `RolesGuard` driven by `@Roles(...)`. `/health` is
  now `@Public()`.
- `common/decorators` — `@Public()`, `@Roles()`, `@CurrentUser()`.
- `main.ts` — global `/api/v1` prefix (health excluded, stays at
  `/health`), a global `ValidationPipe` (whitelist/forbid-non-whitelisted/
  transform), and Swagger served at `/api/docs`.
- A hand-written migration for the `users` table (raw SQL, since
  `migration:generate` needs a live DB connection this environment
  doesn't have working credentials for - **not verified by actually
  running it**, only by review; run `npm run migration:run` and report
  back if it fails) and `npm run seed` to create the first `SUPER_ADMIN`
  login from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars (no user-management
  UI yet - see `docs/KNOWN-ISSUES.md` #2).
- Removed the unused default Nest boilerplate (`AppController`/
  `AppService`/its spec) - dead code now that the guard wiring touched
  `app.module.ts` anyway.
- `docs/SECURITY.md`, `docs/KNOWN-ISSUES.md`, `docs/architecture/API.md`
  updated to reflect what's actually implemented vs. still a target
  (refresh tokens, rate limiting, CORS, security headers, exception
  filter are all deferred - tracked in KNOWN-ISSUES).

Verified: `npm run build`, `npm run lint`, and `npm test` all pass (9
tests: `AuthService.validateUser`/`login` behavior including wrong
password/inactive user/unknown email, and `RolesGuard` allow/deny paths).
Booted the app with `start:dev` against a real local Postgres - every
module up through `JwtModule` initializes correctly; confirmed the same
pre-existing `password authentication failed` from placeholder
credentials (not a code issue - see the backend-scaffold entry above).
**Not verified: an actual login request against a real database** - this
environment has no working DB credentials to run the migration and seed
against. Please run `npm run migration:run`, `npm run seed`, and a real
`POST /api/v1/auth/login` before merging.

**Update:** the owner ran `start:dev` locally and confirmed the app boots
all the way through against her real Postgres - `TypeOrmCoreModule`,
`UsersModule`, and `AuthModule` all initialize, and both routes map
correctly (`/health` public, `/api/v1/auth/login` under the prefix). The
migration and DB wiring are confirmed working; only an actual login
request is still unverified.

## 2026-08-27 (cont'd, 3)

**Phase:** 1 — Foundation (CORS)

Added CORS support (`app.enableCors()` in `main.ts`, allowed origins from
a new `CORS_ORIGINS` env var, default `http://localhost:5173`) - without
it, the frontend login page (next up) would be blocked by the browser
regardless of how correct the request is. `docs/KNOWN-ISSUES.md` #3
updated (CORS item resolved, rate limiting/security headers/exception
filter still open).

Verified: `npm run build`, `npm run lint`, `npm test` (still 9 passing)
all pass.

## 2026-08-27 (cont'd, 4)

**Phase:** 1 — Foundation (frontend authentication)

Wired the frontend to the backend auth API (PR #7): a login page, a real
session, and route protection — the second half of priority item #3 in
`docs/design/DESIGN-SYSTEM.md`.

- `lib/api-client.ts` — thin `fetch` wrapper: JSON in/out, attaches the
  bearer token automatically, normalizes non-2xx responses into a typed
  `ApiError`. `VITE_API_URL` env var, defaults to
  `http://localhost:3000/api/v1` so no `.env` is required for local dev.
- `lib/auth-storage.ts` — single source of truth for the persisted
  session (`localStorage`), shared by the API client and the auth
  context so a plain module and React state stay in sync.
- `features/auth/{auth-context.ts,AuthProvider.tsx,use-auth.ts}` — split
  into three files (context/provider/hook) specifically to satisfy
  react-refresh's "only export components" rule, which `oxlint` flagged
  as a real warning on the original single-file version.
- `features/auth/LoginPage.tsx` — email/password form
  (`react-hook-form` + `zod` validation), redirects to wherever the user
  was headed before being bounced to `/login` (or `/`).
- `routes/RequireAuth.tsx` — wraps the app-shell route tree; redirects
  to `/login` (remembering the intended destination) when signed out.
- `components/ui/Input.tsx` — new base primitive (first form in the
  app), per the DESIGN-SYSTEM.md component inventory.
- `layouts/UserMenu.tsx` and `routes/MoreMenu.tsx` — now show the real
  signed-in user (name, role via a `ROLE_LABELS` map) and a working
  "Log out" instead of the "Staff / Not signed in" placeholder and
  disabled button from the sidebar-refinement phase.
- `types/auth.ts` — `UserRole`/`AuthUser`/`LoginResponse`, mirroring
  `backend/src/modules/users/entities/user.entity.ts`'s `UserRole` enum
  by hand (no shared package between frontend/backend yet - if these
  drift, this file needs a matching update).

Verified: `npm run build` and `npm run lint` (0 problems, including
fixing the real fast-refresh warning above) both pass; served the
production build and confirmed `/login`, `/`, and `/orders` all return
200. **Not verified: an actual login against the real backend** - this
branch doesn't have PR #7's backend auth code checked out (separate
branch), and this environment still has no working DB credentials
either way. Please test for real once both PRs are merged: log in with
the seeded admin account, confirm the sidebar/mobile menu show your real
name and role, confirm Log out returns you to `/login`, and confirm
visiting a protected route while signed out redirects to `/login` and
back to where you were headed after signing in.

## 2026-08-29

**Phase:** 1 — Foundation (recovering lost work)

Found that `main` was missing every file PR #9 added, despite GitHub
showing PR #9 as merged: `git merge-base --is-ancestor` confirmed the
merge commit exists but isn't an ancestor of `main`'s current tip - i.e.
`main`'s history was rewritten to a point before that merge, not simply
reverted on top. Cause unknown; not something this agent did. Did not
force-push or reset anything to "fix" it - instead merged the
still-intact `feat/frontend-auth` branch (verified correct, per its own
merge commit's diff) into a fresh branch off current `main` and opened
it as a normal PR, so the recovery goes through the same review process
as everything else. Confirmed via build/lint and a served production
build that every auth file (`features/auth/`, `lib/api-client.ts`,
`lib/auth-storage.ts`, `routes/RequireAuth.tsx`) is present and intact
in the recovered branch.

## 2026-08-29 (cont'd)

**Phase:** 1 — Foundation (topbar/typography polish + a real tsconfig fix)

Three small owner-requested fixes:

- Moved the sidebar collapse toggle out of the sidebar's own header and
  into the topbar, at the boundary with the sidebar (desktop only - it
  has no meaning on the mobile bottom-nav layout). Fixed a layout bug
  this exposed: the topbar used `justify-between` assuming exactly two
  children; with a third (the toggle) added, the mobile brand text and
  notification bell would have collapsed together instead of spreading
  to the edges. Given the mobile brand text `flex-1` instead.
- Reduced heading sizes app-wide (`text-2xl` → `text-lg` for page titles
  in `ComingSoon`/`MoreMenu`, `text-lg` → `text-base` for the login
  page's wordmark) per explicit feedback: "I don't like big fonts."
  Updated `docs/design/DESIGN-SYSTEM.md`'s typography scale to match
  (page title 28–32px → 18px, section title 18–20px → 16px, body
  14–16px → 13–14px, labels 12–13px → 11–12px) so this is the standing
  rule for future pages, not a one-off.
- `backend/tsconfig.json`: removed `baseUrl` — it was flagged as
  deprecated (TS 6, removed in TS 7), and a check of every import in
  `backend/src` confirmed nothing actually depends on non-relative
  module resolution. Removed the dead option rather than suppressing
  the warning with `ignoreDeprecations`.

Verified: `npm run build` and `npm run lint` pass on both `frontend/`
and `backend/`; served the production build and confirmed `/` and
`/login` still return 200.

## 2026-08-29 (cont'd, 2)

**Phase:** 1 — Foundation (recovering more lost work)

**Same problem as the previous entry, second occurrence.** Before
starting the Dashboard, checked precisely whether PR #10 and PR #11 were
actually reachable from `main` (`git merge-base --is-ancestor <merge
commit> origin/main`) rather than trusting GitHub's "merged" badge. PR
#10 (the previous recovery) checked out fine - genuinely on `main`. PR
#11 (topbar toggle move, smaller headings, dead `baseUrl` removal) did
not - same signature as before: the merge commit exists but isn't an
ancestor of `main`'s current tip.

Recovered the same way: `fix/topbar-collapse-and-typography-v2` still
existed on GitHub with the correct content, so merged it into a fresh
branch off current `main` (clean merge, no conflicts) and opened it as
a new PR rather than touching `main`'s history directly. Confirmed by
grepping the actual file contents (not just trusting the merge output)
that both fixes are genuinely present: the typography scale line reads
"page title 18px" (not the original 28-32px), and the collapse toggle
button is in the topbar's `<header>`, not the sidebar's `<aside>`.

**This has now happened twice in a row**, both times to the frontend
branch stacked on top of another PR at merge time. Flagged prominently
in the PR for the owner to investigate on GitHub's side, since the
agent can only observe git history, not whatever UI action is causing
it.

## 2026-08-29 (cont'd, 3)

**Phase:** 1 — Foundation (Dashboard)

Built the Dashboard, priority item #4 in `docs/design/DESIGN-SYSTEM.md`
- the first real feature page, replacing the `ComingSoon` placeholder
at `/`.

- `components/ui/EmptyState.tsx` - new primitive from the design
  system's inventory: icon + title + description, never a bare "No
  data."
- `features/dashboard/DashboardPage.tsx` - real greeting (time-of-day
  logic, the signed-in user's first name) and real current date, then
  the sections from the design doc's page direction: a "Today"
  overview, "Ready for collection", today's pickups/deliveries side by
  side, and a laundry-flow summary.

**Deliberately not wired to live data.** There's no Orders/Payments/
Pickups/Deliveries backend yet - those are later phases - so every
data section renders its real `EmptyState` with a specific,
honest message about what will appear there and when, rather than
fabricated zero-valued stats or a fake API call that would just 404.
This is real, structurally complete work (the actual layout, real
auth-derived greeting, real date), not a placeholder - only the data
source is deferred. Swap each `EmptyState` for a live query once its
backend module exists.

Verified: `npm run build` and `npm run lint` pass; served the
production build and confirmed `/` and `/orders` return 200. No
visual/browser check possible (no browser tool in this environment).

## 2026-08-29 (cont'd, 4)

**Phase:** 1 — Foundation (recovering the Dashboard, third occurrence)

**Third time this has happened**, same signature: PR #13 (Dashboard)
showed merged on GitHub, but `frontend/src/features/dashboard/` and
`components/ui/EmptyState.tsx` didn't exist on `main` and `App.tsx`
still routed `/` to `ComingSoon`. Confirmed with the same ancestor
check now used as standing practice before building on any recent
merge. `feat/dashboard`'s branch was still intact on GitHub; merged it
into a fresh branch off current `main` (clean, no conflicts), verified
build/lint and that `DashboardPage`/`EmptyState` are genuinely present
in the files, and opened it as a new PR.

All three occurrences so far (#9, #11, #13) were PRs stacked on another
PR's branch at merge time. Strongly flagging this pattern again -
worth resolving on the GitHub side before it happens on something
bigger.

## 2026-08-29 (cont'd, 5)

**Phase:** 1 — Foundation (every nav destination gets a real page)

Every item in the sidebar/mobile nav now has a real page instead of
the generic `ComingSoon` placeholder - `OrdersPage`, `LaundryPage`,
`PickupDeliveryPage`, `CustomersPage`, `PaymentsPage`, `InventoryPage`,
`EmployeesPage`, `ReportsPage`, `SettingsPage` - priority items #5-6,
#9-15 in `docs/design/DESIGN-SYSTEM.md`. `ComingSoon.tsx` removed
(orphaned - nothing references it anymore).

Same honest-empty-state approach as the Dashboard: filters/tabs/range
selectors are real interactive state where the design doc calls for
them (Orders' status filter, Pickup & Delivery's tabs, Reports' date
range), "+ New X" actions are disabled with a tooltip explaining why
rather than linking to flows that don't exist, and every data section
is a real `EmptyState` (or, for Settings, a grouped list marked "Not
yet available") rather than fabricated numbers - there's still no
Orders/Customers/Payments/Inventory/Employees backend. New
`components/ui/PageHeader.tsx` primitive shared across all of them.

This isn't the final design for any of these pages - it's real,
reviewable structure for every screen so the app can be clicked
through end to end, with specific pages then refined one at a time
based on what's actually needed.

Verified: `npm run build` and `npm run lint` pass; served the
production build on a separate port and confirmed all 11 routes
(`/`, `/orders`, `/laundry`, `/pickup-delivery`, `/customers`,
`/payments`, `/inventory`, `/employees`, `/reports`, `/settings`,
`/login`) return 200.

## 2026-08-29 (cont'd, 6)

**Phase:** 1 — Foundation (fixed sidebar/topbar)

Fixed a real layout bug the owner reported: the sidebar and topbar
scrolled away with the page instead of staying in place. Root cause:
`AppShell`'s outer container used `min-h-screen` (a *minimum*, not a
cap) - once a page's content (e.g. Laundry's wide Kanban row) exceeded
the viewport height, the whole container grew past the viewport and
the browser scrolled the entire page, dragging the sidebar/topbar
along with it. Changed to `h-screen overflow-hidden`, which locks the
shell to exactly the viewport height and forces overflow to be
absorbed by `<main>`'s own `overflow-y-auto` instead - sidebar and
topbar now stay fixed, only the content area scrolls.

Verified: `npm run build` and `npm run lint` pass.

## 2026-08-29 (cont'd, 7)

**Phase:** 1 — Foundation (page specifications)

Added `docs/design/PAGES.md`: a detailed page-by-page specification
from the owner, covering exact sections/tabs/statuses for every page
(Dashboard, Orders, New Order, Laundry, Pickup & Delivery, Customers +
Profile, Payments, Inventory, Employees + Profile, Reports, Settings +
sub-pages, Order Details, the paper receipt/order slip, Express/Same-
Day visualization, the customer-facing pickup request, customer mobile
web, and role-aware mobile staff nav), a `components/<domain>/` vs.
`features/<domain>/` folder convention, an illustrative RBAC permission
matrix to inform backend `@Roles()` decisions later, and a named-sprint
build order (same sequence as DESIGN-SYSTEM.md's existing priority
list - Sprints 1-2 done, Sprint 3 "Customers" next).

`docs/design/DESIGN-SYSTEM.md` and `docs/architecture/ARCHITECTURE.md`
updated to cross-reference it. `README.md`'s Status and Setup sections
were also badly stale (still said "Phase 0, no application code yet" /
"not yet available") - corrected with the current status and real
setup steps (env vars, migration, seed, both dev servers).

## 2026-08-29 (cont'd, 8)

**Phase:** 1 — Foundation (Customers backend — Sprint 3)

First real business module: `modules/customers` (`Customer` entity,
service, controller, DTOs). `POST/GET/PATCH /api/v1/customers` +
`GET /api/v1/customers/:id`, list endpoint supports pagination and a
`search` param matching name/phone/customer number
(case-insensitive), following the response envelope
(`{data, meta}`) documented in `docs/architecture/API.md` for the
first time. New shared `common/dto/pagination-query.dto.ts` and
`common/types/paginated-result.ts` for reuse by future list endpoints.

`customer_number` (e.g. `C-00001`) is generated from a dedicated
Postgres sequence created in the migration, so concurrent creates
never collide. The `C-XXXXX` format is illustrative only (matches
every mockup across `docs/design/`) - not a client-confirmed
numbering scheme, and centralized in one place if it needs to change.

RBAC: read is open to any authenticated user (e.g. laundry staff
confirming whose order they're holding); create/update restricted to
Super Admin/Manager/Receptionist/Cashier via `@Roles()` - the first
real use of the `RolesGuard` wired since the auth phase. This split is
a judgment call (not in `docs/design/PAGES.md`'s permission matrix,
which doesn't list Customers explicitly), flagged in the PR.

A real bug caught by actually running the migration (not just
building): `alternativePhone`/`address`/`notes` typed `string | null`
made TypeORM's reflection-based type inference fail
(`DataTypeNotSupportedError: Data type "Object"... not supported`) -
fixed by adding explicit `type: 'varchar'` to those columns.

Verified for real, not just built: ran the migration against a real
Postgres, booted the app (on a spare port, since the owner had her own
instance running on 3000 - didn't touch it), logged in with the seeded
admin account, and exercised every endpoint over HTTP - create,
list, search, get-by-id, update, a validation failure (missing
`name` → 400 with a clear message), a 404 for an unknown id, and
confirmed unauthenticated requests get 401. Deleted the test customer
created during verification afterward. `npm run build`, `npm run
lint`, `npm test` (14/14, 5 new) all pass.
**Phase:** 1 — Foundation (Dashboard refresh, per PAGES.md §1)

Reworked `DashboardPage` to match the detailed spec in
`docs/design/PAGES.md` §1: a four-card business-overview row (Today's
Orders/Revenue/Ready/Outstanding - new `components/ui/StatCard.tsx`),
a compact clickable laundry-flow row (7 stages, links to `/laundry`),
"Ready for collection" renamed to "Needs attention" with broader copy
(ready/overdue/unpaid/express-due-today), header actions (+ Customer,
+ New Order - disabled with a tooltip, same pattern as every other
page's create action), and a "Revenue this week" section. Pickups/
deliveries columns unchanged.

Every value is a genuine `0`, never a fabricated trend percentage -
there's no historical data to compute a trend from, and DESIGN-
SYSTEM.md/CLAUDE.md both rule out simulating functionality that
doesn't exist yet.

Verified: `npm run build` and `npm run lint` pass; served the
production build on a separate port and confirmed `/` returns 200.
