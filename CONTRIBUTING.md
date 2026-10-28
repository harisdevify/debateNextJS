# Contributing

Read [backend architecture](docs/backend-architecture.md) before adding API features.

1. Create a focused branch from current main. Keep structural refactors separate
   from API behavior and database schema changes where possible.
2. Keep feature code in `api/src/modules/<feature>/`; register dependencies through
   Nest modules. Share only reusable helpers through `common/`.
3. Never edit generated Prisma files, commit secrets, or rewrite an applied migration.
   For schema changes, create a new migration and document rollout requirements.
4. Preserve existing HTTP routes, socket payloads and public error contracts unless
   the PR explicitly coordinates a client update.
5. Run backend build, typecheck and unit tests; run integration tests only with a
   dedicated test database. For client changes run its typecheck, lint, tests and build.
6. Include the problem, behavior change (if any), test results and rollout notes in
   the PR. Review CI and manually test login, two-user calling/chat and moderation
   before merging changes that affect those paths.

Use small commits and explicit names. Document non-obvious transaction/concurrency
rules. Avoid catch-all utility files, hidden global feature providers, circular
imports, and speculative abstractions. Keep framework upgrades in separate PRs.
