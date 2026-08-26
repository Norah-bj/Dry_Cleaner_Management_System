# EDCMS — Testing Strategy & Definition of Done

## Test levels

- **Backend unit tests** — services/business logic in isolation.
- **Backend integration/API tests** — controller + service + DB (e.g. via
  a test database), covering: happy path, invalid input, empty input,
  boundary values, unauthorized, forbidden, duplicate data, and
  business-rule violations (e.g. inventory going negative).
- **Frontend component/interaction tests** — key components and forms.
- **End-to-end** for the critical path:
  `customer → order → payment → laundry workflow → ready → pickup/delivery`.

## What every feature must test

- Happy path
- Invalid/missing input
- Permission denial (wrong role)
- Duplicate/conflicting data (e.g. duplicate customer number)
- A relevant business-rule edge case (e.g. partial payment leaving a
  balance, inventory usage exceeding stock)

## Definition of Done

A feature is not done because the UI renders. It's done when:

- [ ] Requirement and business rule confirmed against `docs/requirements/`
- [ ] Database changes made via migration
- [ ] API implemented per `docs/architecture/API.md` conventions
- [ ] Validation complete (DTOs)
- [ ] Authorization complete (guards/permissions)
- [ ] Frontend complete, including loading/empty/error states
- [ ] Responsive on both desktop and mobile viewports
- [ ] Tests written and passing (state the actual command + result)
- [ ] Type-check passing
- [ ] Lint passing
- [ ] `git diff` reviewed for unrelated changes
- [ ] Documentation updated (docs/features/, CHANGELOG.md, and any
      architecture/API/business-rule doc affected)
- [ ] Commit created with a clear message

## Rule for AI agents

Never report a test as passing, a migration as applied, or an endpoint as
working unless you actually ran it and observed the result in this session.
"Should work" is not "verified."
