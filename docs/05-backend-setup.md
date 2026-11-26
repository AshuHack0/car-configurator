# 5. Backend setup

How the backend repository is organised, how to run it locally, and the team's working rules.
The backend lives in its own repository, `modified-api`, next to this frontend (`car-configurator`).

## 5.1 Repository layout

```text
modified-api/
├── src/
│   ├── main.ts                  # bootstrap: Nest app, CORS, helmet, validation pipe, Swagger at /docs
│   ├── app.module.ts
│   ├── config/                  # typed env config (zod-validated at startup)
│   ├── common/                  # error filter, request-id, rate-limit guard, pagination, idempotency
│   ├── prisma/                  # PrismaService
│   ├── modules/
│   │   ├── health/
│   │   ├── catalogue/           # brands, vehicles, categories, products, paints, compatibility
│   │   ├── pricing/             # quote calculation (single source of truth for prices)
│   │   ├── builds/              # save/share builds, edit tokens
│   │   ├── enquiries/           # create lead, email + CRM webhook, admin inbox
│   │   ├── uploads/             # pre-signed URLs to R2, expiry
│   │   ├── ai/                  # identify (sync), visualize (job), budget tracking
│   │   ├── auth/                # login, refresh, JWT guard, roles
│   │   └── admin/               # catalogue CRUD, stats, AI usage, CSV export
│   └── worker/
│       └── ai.worker.ts         # BullMQ processor for visualize jobs
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                  # imports today's catalogue from car-configurator/src/data
├── test/
│   ├── unit/                    # pricing rules, validation
│   └── e2e/                     # supertest against a test database
├── docker-compose.yml           # postgres + redis for local development
├── .env.example
├── Dockerfile
└── README.md
```

## 5.2 Local setup

Prerequisites: Node.js 20 LTS, Docker Desktop, pnpm (or npm).

```bash
git clone <repo-url>/modified-api && cd modified-api
cp .env.example .env              # fill in values (see 5.3); never commit .env
docker compose up -d              # PostgreSQL 16 on 5432, Redis 7 on 6379
pnpm install
pnpm prisma migrate dev           # create tables
pnpm prisma db seed               # load the catalogue from the frontend data files
pnpm start:dev                    # API on http://localhost:4000, docs on http://localhost:4000/docs
pnpm worker:dev                   # in a second terminal: AI job worker
```

Frontend: in `car-configurator/.env.local` set `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`.

## 5.3 Environment variables

| Name | Example | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `4000` | |
| `DATABASE_URL` | `postgresql://modified:modified@localhost:5432/modified` | PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Queue and rate limits |
| `CORS_ORIGINS` | `http://localhost:3123,https://modified.example` | Allowed frontends |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 64 random bytes each | Admin tokens |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | | Object storage |
| `CDN_BASE_URL` | `https://cdn.modified.example` | Public URL for models and photos |
| `GEMINI_API_KEY` | | AI image edit and identify |
| `ANTHROPIC_API_KEY` | | Optional identify provider |
| `AI_PROVIDER` | `gemini` | `gemini` or `anthropic` for identify |
| `AI_MONTHLY_BUDGET_USD` | `50` | Hard stop for AI spending |
| `RESEND_API_KEY` | | Enquiry emails |
| `ENQUIRY_NOTIFY_TO` | studio inbox address | Who receives new leads |
| `CRM_WEBHOOK_URL` | | Optional |
| `SENTRY_DSN` | | Error tracking |

Secrets live in the hosting platform's secret store. `.env.example` lists names only, no values.

## 5.4 Working rules

**Git**

- `main` is protected: no direct pushes; every change goes through a pull request with one approving review
  and green CI.
- Branch names: `feat/builds-share-code`, `fix/quote-rounding`, `chore/upgrade-prisma`.
- Commit messages: present tense, what and why (`Add share codes to saved builds`). Squash-merge.

**Code**

- TypeScript `strict`. ESLint + Prettier on commit (husky + lint-staged).
- One Nest module per area; controllers stay thin, business rules live in services.
- Every endpoint has DTO validation and Swagger decorators; the OpenAPI file is generated, never hand-edited
  after the first build (this draft is the starting contract).
- Prices: integer INR only; all totals come from `PricingService`.
- Database changes only through Prisma migrations, reviewed in the pull request.

**Tests**

| Level | Tool | Must cover |
|---|---|---|
| Unit | Jest | Pricing rules, compatibility checks, validation |
| End-to-end | Jest + supertest + test database | Every public endpoint's happy path and main errors |
| Contract | Generated OpenAPI checked in CI against this draft | No accidental breaking changes |

Target: pricing and enquiry modules at 90%+ line coverage; overall 70%+.

## 5.5 CI/CD

```mermaid
flowchart LR
  PR[Pull request] --> CI[GitHub Actions:<br/>lint, typecheck, unit, e2e, build]
  CI -->|merge to main| STG[Deploy to staging<br/>migrations run first]
  STG -->|manual approve| PROD[Deploy to production]
```

- Every pull request also gets a Vercel preview of the frontend pointing at staging.
- Migrations run automatically before the new version starts; destructive migrations need a two-step release.

## 5.6 Environments

| Environment | Frontend | API | Data |
|---|---|---|---|
| Local | localhost:3123 | localhost:4000 | Docker Postgres + seed |
| Staging | Vercel preview | `api-staging.modified.example` | Separate database, test AI budget ($5/month) |
| Production | `modified.example` | `api.modified.example` | Daily backups, 7-day point-in-time restore |
