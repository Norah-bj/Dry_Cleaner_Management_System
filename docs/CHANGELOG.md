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

