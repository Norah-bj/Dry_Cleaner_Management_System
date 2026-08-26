# 0004 — Modular monolith, not microservices

**Status:** Accepted (2026-08-26)

## Decision

EDCMS backend is one NestJS application deployed as a single unit, internally
organized into business-domain modules (see ARCHITECTURE.md).

## Why

- Single client, single deployment target, no independent-scaling
  requirement in Phase 1 — microservices would add operational complexity
  (service discovery, distributed transactions, network failure handling)
  with no corresponding benefit at this scale.
- NestJS modules already give clean domain boundaries; splitting into
  services can happen later, per module, if a real scaling need appears.
- Easier for a small team (effectively one developer + AI assistance) to
  reason about and operate.

## Alternatives considered

- **Microservices from day one** — rejected as premature: no requirement
  today justifies the added deployment/ops/debugging cost.

## Consequences

- Module boundaries (controller/service/entities per domain) must stay
  clean specifically so a future extraction is possible if ever needed —
  no direct cross-module repository access, only via exported services.
- Do not split any module into a separate service without a new ADR
  justified by a concrete scaling or team requirement.
