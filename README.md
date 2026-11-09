# Wasli

Student pickup coordination for tutoring centers in Morocco. Parents request a pickup, teachers prepare the student, and reception confirms handover with a one-time PIN. A center's data stays inside that center.

This repository is the first development milestone: a local monorepo, PostgreSQL schema, and the safety rules that later pickup screens will call. It does not yet provide login, student administration, or the live pickup queue.

## Applications

| Path | Role |
| --- | --- |
| `apps/api` | NestJS API, Prisma, PostgreSQL |
| `apps/web` | Next.js dashboard shell for staff and center administrators |
| `apps/mobile` | Expo application shell for parents |
| `packages/shared` | Pickup state machine and shared copy |
| `packages/validation` | Request payload schemas |
| `packages/config` | API environment parsing |

Teacher, reception, center admin, and platform admin interfaces will share the web application. Parents use the mobile application.

## Local setup

Requirements: Node.js 22.12 or newer, npm, and Docker.

```powershell
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
npm install
docker compose up -d postgres
npm run db:deploy
npm test
npm run test:integration
npm run dev:api
npm run dev:web
npm run dev:mobile
```

- API: `http://localhost:3001/api/v1/health`
- OpenAPI: `http://localhost:3001/api/docs`
- Web: `http://localhost:3000`

`npm run dev:api` reads `apps/api/.env` and lets that file override a `DATABASE_URL` already present in the shell. PostgreSQL is published on port 55432 so it does not collide with another Postgres already listening on 5432. The migration role is `wasli`. The API connects as `wasli_app`, which is subject to row-level security. These passwords are local defaults. Replace them before any shared or production deployment.

`docker compose up --build` also starts the API container. Use `docker compose up -d postgres` when you want to run the API from the host.

## What this milestone enforces

- Every center-owned table carries `center_id`. Cross-center student, class, and session links are rejected by foreign keys.
- The `wasli_app` role cannot read or write another center's rows unless the transaction sets `app.center_id`, or a platform operation explicitly sets `app.bypass_rls`.
- Only one active pickup request can exist for a student in a class session.
- A platform administrator cannot be stored as a member of a center, and a center role cannot be stored without a center.
- Audit logs and pickup events cannot be updated or deleted.
- Pickup verification stores a PIN hash, not the PIN.
- The scheduler can move a request toward notification or expiry. It cannot start preparation, mark a student ready, or complete handover. Handover from `READY` requires an authorized staff member and a verified PIN. A delay requires a reason and does not release the student.

The transition rules live in `@wasli/shared` and are called by `PickupTransitionService`. Unit tests cover every actor, state, and PIN combination. Integration tests run these database rules against PostgreSQL.

## Not built yet

Authentication, center administration, academic setup, pickup requests over HTTP, queue priority, realtime updates, push notifications, and handover endpoints are later milestones. The web and mobile screens only confirm that the foundation is running. They do not show demonstration students.

Out of scope until a later decision: AI scheduling, GPS, WhatsApp, payments, advanced analytics, multiple branches, facial recognition, automatic student release, and subscription billing.

## Checks

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run test:integration
```

GitHub Actions runs the same checks with PostgreSQL.
