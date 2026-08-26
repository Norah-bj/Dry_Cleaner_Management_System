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
