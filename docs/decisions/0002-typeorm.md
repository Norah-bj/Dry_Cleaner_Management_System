# 0002 — Use TypeORM as the ORM

**Status:** Accepted (2026-08-26)

## Decision

Use TypeORM for database access, with entities co-located inside each
NestJS module.

## Why

- First-class NestJS integration (`@nestjs/typeorm`).
- Native migration support, needed for a production system with real
  client data.
- Entity classes map naturally onto one-entity-per-module structure.
- Strong PostgreSQL support (types, relations, transactions).

## Alternatives considered

- **Prisma** — good DX but its schema-file-first model fits less naturally
  into NestJS's per-module entity structure; would require restructuring
  module boundaries around the Prisma schema instead of the reverse.
- **Raw SQL / query builder only** — rejected: more boilerplate, no
  migration tooling out of the box, higher risk of inconsistency across
  modules.

## Consequences

- Every module's `entities/` folder is a TypeORM entity, and schema changes
  go through TypeORM migrations — no hand-edited schema changes against a
  running database.
- If a future performance-critical path needs raw SQL, use TypeORM's query
  builder or raw query escape hatch rather than switching ORMs for that one
  path.
