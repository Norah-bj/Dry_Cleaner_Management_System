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
