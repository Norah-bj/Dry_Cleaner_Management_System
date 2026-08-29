# EDCMS — EBENEZER Dry Cleaner Management System

Business operations system for EBENEZER DRY CLEANER (Nyamata, Bugesera,
Rwanda), covering the full order lifecycle: customer registration → garment
intake → processing → payment → pickup/delivery.

**Status:** Phase 1 — Foundation, in progress. Backend (auth/RBAC) and
frontend (app shell, login, and a real page for every nav item) are
running; business features (Orders, Customers, etc.) are being built one
at a time — see [docs/design/PAGES.md](docs/design/PAGES.md) for the
build order and [docs/CHANGELOG.md](docs/CHANGELOG.md) for what's landed.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: NestJS + TypeScript
- ORM: TypeORM
- Database: PostgreSQL
- API: REST (`/api/v1`), documented with Swagger/OpenAPI
- Architecture: modular monolith

## Start here

- [CLAUDE.md](CLAUDE.md) — engineering rules for AI-assisted development on
  this repo. Read before making any change.
- [docs/requirements/REQUIREMENTS.md](docs/requirements/REQUIREMENTS.md) —
  scope and open questions for the client.
- [docs/requirements/BUSINESS-RULES.md](docs/requirements/BUSINESS-RULES.md)
  — confirmed business rules.
- [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) —
  system design and folder structure.
- [docs/architecture/DATABASE.md](docs/architecture/DATABASE.md) — ERD.
- [docs/architecture/API.md](docs/architecture/API.md) — API conventions.
- [docs/decisions/](docs/decisions/) — architecture decision records.
- [docs/design/DESIGN-SYSTEM.md](docs/design/DESIGN-SYSTEM.md) — frontend
  design direction ("The Clean Journey"), tokens, and component inventory.
- [docs/design/PAGES.md](docs/design/PAGES.md) — detailed spec for every
  page, RBAC matrix, and the sprint build order.

## Setup

Prerequisites: Node.js, a running local PostgreSQL.

**Backend:**

```
cd backend
npm install
cp .env.example .env    # fill in DATABASE_*, JWT_SECRET, CORS_ORIGINS
npm run migration:run
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... ADMIN_NAME="Your Name" npm run seed
npm run start:dev       # http://localhost:3000, Swagger at /api/docs
```

**Frontend:**

```
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Open the frontend URL, sign in with the `ADMIN_EMAIL`/`ADMIN_PASSWORD`
you seeded above.
