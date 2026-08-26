# 0003 — Use PostgreSQL as the database

**Status:** Accepted (2026-08-26)

## Decision

PostgreSQL is the single source of truth for all EDCMS data.

## Why

- The domain is heavily relational: customers → orders → items/materials/
  payments/status history/pickup/delivery, with real foreign-key
  constraints that matter (e.g. never let inventory go negative, never lose
  a payment record).
- Strong transaction support needed for operations like "record payment and
  update order balance" atomically.
- Mature, well-understood, works cleanly with TypeORM.

## Alternatives considered

- **MySQL** — viable, but no material advantage over Postgres for this
  domain; Postgres has better support for constraints/JSON columns/full
  text search we may use later (e.g. order search).
- **MongoDB** — rejected: the data is relational by nature (orders belong
  to customers, payments belong to orders, etc.); a document model would
  push relational integrity checks into application code that the database
  should be enforcing.

## Consequences

- All schema changes go through TypeORM migrations against Postgres.
- Any future read-heavy/analytics need is solved with indexes/read replicas
  on Postgres first, before considering a second datastore.
