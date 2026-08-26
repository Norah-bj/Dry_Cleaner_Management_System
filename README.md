# EDCMS — EBENEZER Dry Cleaner Management System

Business operations system for EBENEZER DRY CLEANER (Nyamata, Bugesera,
Rwanda), covering the full order lifecycle: customer registration → garment
intake → processing → payment → pickup/delivery.

**Status:** Phase 0 — Discovery. No application code yet; this repository
currently holds the planning/architecture documentation that Phase 1
implementation will follow.

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

## Setup

Not yet available — `frontend/` and `backend/` are scaffolded in Phase 1.
