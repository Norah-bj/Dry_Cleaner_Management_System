# CLAUDE.md — EDCMS Engineering Rules

This file governs how Claude (or any AI coding agent) works in this repository.
Read it before touching any code. If a request conflicts with this file, follow
this file and flag the conflict to the human owner instead of silently picking one.

## Project

EDCMS (EBENEZER Dry Cleaner Management System) is a business operations system
for EBENEZER DRY CLEANER, Nyamata, Bugesera, Rwanda (owner: HIRWA Triphine). It
manages the full order lifecycle: customer registration → garment intake →
processing → payment → pickup/delivery. See [docs/requirements/REQUIREMENTS.md](docs/requirements/REQUIREMENTS.md)
for scope and [docs/requirements/BUSINESS-RULES.md](docs/requirements/BUSINESS-RULES.md)
for confirmed business rules.

**Frontend work specifically** must follow [docs/design/DESIGN-SYSTEM.md](docs/design/DESIGN-SYSTEM.md)
— the "Clean Journey" concept, color/type tokens, component inventory, and
build priority order are a settled design decision, not a suggestion. Don't
invent a different palette, icon library, or page layout ad hoc.

## Stack (frozen — do not change without an ADR in docs/decisions/)

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: NestJS + TypeScript
- ORM: TypeORM
- Database: PostgreSQL
- API: REST, versioned at `/api/v1`, documented with Swagger/OpenAPI
- Auth: JWT + RBAC (guards/decorators)
- Architecture: **modular monolith** — see [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)

Do not introduce microservices, a second database, a second ORM, GraphQL, or a
different frontend framework without an explicit decision recorded in
`docs/decisions/`.

## Current phase

**Phase 0 — Discovery.** No application code exists yet. The repository
currently contains only documentation. Do not scaffold `frontend/` or
`backend/` until the human owner explicitly asks to start Phase 1 (Foundation).

## Core rules

1. **Never invent business requirements or numbers.** Prices, discount
   policy, cancellation policy, exact EBM device/software, operating hours,
   and which payment methods are actually active are all owned by the client.
   If it's not written in `docs/requirements/`, ask — don't assume a
   plausible-sounding default.
2. **Inspect before you edit.** Run `git status`, `git log --oneline -10`,
   and read the relevant files/docs before making changes — even ones you
   think you already know from earlier in the conversation.
3. **Keep changes scoped.** Implement the requested feature/fix only. If you
   find an unrelated problem, report it (or file it under
   `docs/KNOWN-ISSUES.md`) instead of fixing it inline.
4. **No unnecessary dependencies.** Before adding a package, check whether
   the existing stack already solves the problem.
5. **Never claim something is done, tested, or verified unless you actually
   ran it.** "Tests pass" means you ran the test command and saw it pass —
   quote the command and result.
6. **Preserve existing behavior** unless a behavior change is explicitly
   requested, even while refactoring or optimizing.
7. **Update documentation** (`docs/`, and `CLAUDE.md` itself if a rule or
   workflow changes) **in the same piece of work** whenever code changes
   affect architecture, API contracts, business rules, or scope — never as
   a separate follow-up. This includes adding a dated entry to
   `docs/CHANGELOG.md`.
8. **Express/Same-Day are a service priority/type on the order, never a
   laundry status.** See BUSINESS-RULES.md — this is a settled schema
   decision, not a suggestion.
9. **EBM and full WhatsApp Business API integration are discovery items.**
   Build the `ebm` and `whatsapp` modules as isolated service boundaries, but
   do not fabricate an integration against a system we haven't confirmed.

## Never do these without explicit confirmation

- `git reset --hard`, `git clean -fd`, `git checkout .` / `git restore .`,
  force push, rewriting shared history, committing directly to `main`.
- Dropping/recreating the database, deleting or hand-editing existing
  migrations, resetting data.
- Deleting existing functionality to make a new feature simpler to build.
- Disabling lint/type-check/tests to get a build green, or commenting out a
  failing test.
- Committing secrets, `.env` files, or credentials.

## Feature workflow

Understand requirement → inspect repo/git state → propose a short
implementation plan for anything non-trivial → get approval → implement →
write/run tests → lint + type-check → review your own `git diff` → update
docs → commit with a clear message. See [docs/testing/TESTING.md](docs/testing/TESTING.md)
for the Definition of Done checklist.

## Git & PR workflow

This is a solo project — there is no second human reviewer. The PR's job is
to hand the owner a clear, well-described, reviewable diff, not to route
work to a team.

1. **Never commit directly to `main`.** Work on a branch per logical
   change: `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`.
2. Implement the change, including the doc updates required by rule 7
   above, and run tests/lint/type-check for real.
3. Commit with a clear, conventional message (`feat: ...`, `fix: ...`,
   `docs: ...`).
4. Push the branch and open a PR with `gh pr create`, filling in
   `.github/PULL_REQUEST_TEMPLATE.md` completely — summary, actual changes,
   which docs were updated (or why none applied), the exact test commands
   run and their results, and the Definition of Done checklist.
5. **Stop there.** Do not merge the PR, and do not merge to `main`
   yourself under any circumstance — the owner reviews and merges every PR
   herself.

## Out of scope for Phase 1

Do not add: native mobile apps, AI demand forecasting, loyalty/coupons,
franchise/multi-tenant support, subscription billing, advanced BI, full
WhatsApp Business API automation, or route optimization — even if they seem
like natural extensions. See REQUIREMENTS.md §Excluded.

## Where things live

```
docs/requirements/   what we're building and the confirmed business rules
docs/architecture/   system architecture, DB schema/ERD, API conventions
docs/decisions/      ADRs — why we chose X over Y
docs/testing/        test strategy + Definition of Done
docs/deployment/     production readiness checklist (Phase 10, not yet active)
docs/features/       per-feature specs, added as features are built
docs/SECURITY.md     security baseline
docs/CHANGELOG.md    dated log of what changed and why
docs/KNOWN-ISSUES.md open issues and deferred problems
```
