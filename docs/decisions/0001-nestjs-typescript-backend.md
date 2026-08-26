# 0001 — Use NestJS + TypeScript for the backend

**Status:** Accepted (2026-08-26)

## Decision

Backend is built with NestJS + TypeScript instead of the originally
considered Laravel/PHP stack.

## Why

- Developer already knows TypeScript/JavaScript/Node; React (frontend) +
  NestJS (backend) gives one language across the whole stack.
- NestJS has an opinionated, modular structure that maps naturally onto our
  business domains (orders, payments, inventory, ...).
- Built-in dependency injection, guards (fits RBAC), pipes (fits
  validation), and strong PostgreSQL support via TypeORM.
- Avoids learning a new language (PHP) and a new framework (Laravel) at the
  same time as the business domain.

## Alternatives considered

- **Laravel (PHP)** — originally planned, rejected to avoid stacking a new
  language on top of a new domain and a real client deadline.
- **Express/Fastify (unopinionated Node)** — rejected: no structural
  guardrails, would reinvent module boundaries and DI ad hoc.

## Consequences

- Team standardizes on NestJS module conventions (see ARCHITECTURE.md) for
  every business domain, not just some.
- Any future move to microservices or a different backend framework needs
  its own ADR.
