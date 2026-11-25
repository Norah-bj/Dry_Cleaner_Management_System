# EDCMS — Deployment (Phase 10 concern)

Not yet active — no code exists to deploy. Captured here so the production
bar is known in advance and isn't improvised at the end.

## Before launch, required

- [ ] HTTPS
- [ ] Production PostgreSQL instance, separate from any dev/staging DB
- [ ] Automated database backups + at least one tested restore
- [ ] Secrets via environment variables, not committed anywhere
- [ ] Centralized logging
- [ ] Error monitoring
- [x] Rate limiting active on public endpoints (built in Phase 4; keep `RATE_LIMIT_ENABLED=true`, set `TRUST_PROXY` behind a proxy)
- [x] Security headers active (see SECURITY.md) (API: helmet. Set the frontend's own headers, incl. CSP, on its host)
- [x] Database indexes on hot query paths (order lookup, customer search)
- [ ] Production build of frontend and backend, not dev servers
- [ ] Basic performance check under expected load

## Not decided yet

Hosting target, containerization approach, and CI/CD pipeline are not
chosen — decide these when Phase 1 nears completion, not speculatively now.
