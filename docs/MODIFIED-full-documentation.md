# MODIFIED — Product, Architecture and Backend API Plan

MODIFIED is a web car configurator: a customer picks a car, customises it in live 3D (paint, wheels,
body kit, interior), sees an estimated price, and sends an enquiry. The **frontend is built and working**;
the **backend is designed here and not built yet**.

Status as of 26 Nov 2026.

> **Context for an AI assistant:** this single file is the complete project documentation for MODIFIED,
> a web-based 3D car configurator. The frontend (Next.js 14, React Three Fiber) is built and working; the
> backend described here is a proposal and has not been built yet. Sections 1–8 explain the product,
> architecture, database, API, setup, 3D pipeline, security/costs and roadmap. The appendix holds the full
> OpenAPI 3.1 specification. Money is integer INR; dates are ISO 8601 UTC.

## Contents

| Section | What it answers | Main reader |
|---|---|---|
| [1. Product overview](#1-product-overview) | What the product does today, who it is for, what is in and out of scope | Everyone |
| [2. Architecture](#2-architecture) | How the system fits together now and after the backend; chosen tech stack and why | Lead, developers |
| [3. Data model](#3-data-model) | The database tables and how they relate | Developers |
| [4. API reference](#4-api-reference) | Every endpoint, request and response, errors, limits | Developers, designer (for states) |
| [5. Backend setup](#5-backend-setup) | Repository layout, local setup, environment variables, conventions, CI/CD, deployment | Developers |
| [6. 3D asset pipeline](#6-3d-asset-pipeline) | How a car goes from a Blender/GLB file to the website, with size budgets | Lead, developers, 3D artist |
| [7. Security, privacy and costs](#7-security-privacy-and-costs) | Auth, rate limits, customer data, AI spending, model licences | Lead, manager |
| [8. Roadmap](#8-roadmap) | Phases, milestones, estimates and who does what | Manager, everyone |
| [Appendix: OpenAPI specification](#appendix-openapi-specification) | The same API as a machine-readable contract | Developers |

## One-minute summary

- **Built:** Next.js 14 frontend with React Three Fiber 3D configurator, 21 cars (3 fully 3D with opening
  doors), 38 parts, 7 paints + custom colour, 6 scenes, two AI photo features.
- **Missing:** a backend. Catalogue data is hard-coded in the frontend, saved builds live only in the
  customer's browser, enquiries only open an email draft, and AI spending is guarded by an in-memory
  counter that resets on every restart.
- **Proposed backend:** a separate TypeScript API (NestJS) with PostgreSQL (Prisma), object storage for 3D
  models and photos, and a job queue for AI image generation. Versioned REST API at `/api/v1`, documented
  with OpenAPI.
- **First backend milestone (about 3 weeks for one developer):** catalogue API, saved and shareable builds,
  server-side pricing, enquiries with an admin inbox.

## Conventions used in these docs

- Money is in **Indian rupees (INR)**, stored as whole rupees (integers). All prices in the current demo
  are illustrative.
- Dates are ISO 8601 in UTC (`2026-11-26T10:30:00Z`).
- "Proposed" means designed but not built. Anything marked **Open question** needs a decision.

---

# 1. Product overview

MODIFIED lets a car owner or buyer design modifications for a specific car in live 3D, see what it
would cost, and send an enquiry to the studio. It replaces a showroom conversation with a self-serve
experience that ends in a qualified lead.

## Who uses it

| User | Goal | Where |
|---|---|---|
| Customer (anonymous) | Pick their car, try paint, wheels and parts, see a price, save or share the build, enquire | Public website |
| Customer with a photo | Upload photos of their own car to auto-select the model and paint, or see the build on their own car | "Upload your car", "See it for real" |
| Studio staff (admin) | Manage cars, parts and prices; read and follow up enquiries | Admin area (proposed) |

## What works today (frontend)

| Area | Detail |
|---|---|
| Home | Animated intro, scrolling showroom, feature tiles |
| Models | 21 cars across 6 brands (Mercedes-Benz, BMW, Audi, Porsche, Lamborghini, Volvo), brand and body filters, real photos |
| Configurator | Live 3D; paint (7 presets + any custom colour in 4 finishes); 5 wheel designs with finishes; 4 spoilers; front bumpers, rear bumpers, diffuser; 3 side skirts; lights, grille, roof, exhaust, carbon trim |
| Opening parts | Doors, boot/luggage lid and fuel flap open by clicking dots (Volvo S90, Porsche 911 v2) |
| Interior | Seated camera view; 3 seat colours on the Volvo S90 |
| Scenes | Courtyard, Riverside, Plains, Studio, Warm, Cool |
| Price | Live estimated total and a summary list |
| Save / load | One saved build per car, **stored only in this browser** |
| Enquire | **Opens an empty email draft** with the build listed |
| Upload your car | Up to 8 photos; AI identifies make, model, year, paint and existing mods (pilot: Porsche, BMW) |
| See it for real | AI edits a real photo of the car to show the chosen paint and parts |

## Fully 3D cars

| Car | Opens | Interior view | Download | GPU texture memory |
|---|---|---|---|---|
| Volvo S90 (v3) | Doors, boot, fuel flap | Yes, 3 seat colours | 12.5 MB | ~83 MB |
| Porsche 911 Carrera 4S (v2) | Doors, front luggage lid | Yes, simple modelled cabin | 2.1 MB | ~6 MB |
| BMW M4 | — | — | — | — |

The other 18 cars show the closest available 3D body (the M4, the 911 or a generic coupe) with a note
telling the customer.

## Scope

**In scope for the first release**

- Catalogue served from a database and editable by staff
- Saved builds with a shareable link
- Prices calculated on the server (the browser total becomes display-only)
- Enquiries stored in a database, emailed to the studio, visible in an admin inbox
- AI features moved behind the backend with a persistent spending cap

**Out of scope for now**

- Customer accounts and login
- Online payment or booking
- Real-time stock or supplier pricing
- Multiple studios or locations (single tenant)

## Open questions

1. Is the first audience internal, a client pitch, or real customers? This sets the polish level and date.
2. Which cars must be fully 3D at launch, and what is the 3D model budget?
3. Where must enquiries go: email only, or also a CRM (for example HubSpot, Zoho)?
4. Keep both AI photo features, and with what monthly spending limit?

---

# 2. Architecture

Today everything runs in one Next.js app with the catalogue compiled into the frontend. The proposed
design moves data, pricing, enquiries and AI work to a separate backend API, and keeps the frontend
focused on the 3D experience.

## 2.1 Today (frontend only)

```mermaid
flowchart LR
  B[Browser] -->|pages + JS bundle| N[Next.js app on Vercel]
  N -->|catalogue compiled in<br/>src/data/*.ts| B
  B -->|3D models, photos| S[Static files<br/>public/models, public/photos]
  B -->|saved builds| L[(Browser localStorage)]
  B -->|Enquire = mailto:| E[Customer's email app]
  N -->|/api/identify, /api/visualize| AI[Google Gemini / Anthropic Claude]
```

Limits of this setup:

| Problem | Effect |
|---|---|
| Catalogue and prices are in the code | Every price or part change needs a developer and a deploy |
| Builds saved in localStorage | Lost when the customer changes device or clears the browser; cannot be shared |
| Enquiry is a `mailto:` link | No record of leads; depends on the customer sending the email |
| Price calculated in the browser | Can be edited by the customer; no single source of truth |
| AI cap is an in-memory counter | Resets on every restart or new server instance; spending is not really capped |
| 3D files served from the app | Large files in the git repository and in every deploy |

## 2.2 Proposed

```mermaid
flowchart LR
  B[Browser] --> W[Next.js frontend<br/>Vercel]
  B -->|REST /api/v1| API[MODIFIED API<br/>NestJS, Node 20]
  B -->|3D models, photos via CDN| CDN[Object storage + CDN<br/>Cloudflare R2]
  API --> DB[(PostgreSQL<br/>Prisma)]
  API --> Q[(Redis<br/>BullMQ queue, rate limits)]
  Q --> WK[AI worker]
  WK --> AI[Gemini / Claude APIs]
  WK --> CDN
  API --> M[Email service<br/>Resend / SES]
  API -.->|optional| CRM[CRM webhook]
  ADM[Admin area<br/>Next.js /admin] -->|JWT| API
```

### Request flows

**Configure and price**

1. Frontend loads `GET /vehicles/{id}` and `GET /vehicles/{id}/compatibility` (cached by the CDN).
2. The customer changes options; the 3D view updates locally with no server calls.
3. The price shown is the frontend estimate; on Summary, Save or Enquire the frontend calls
   `POST /quotes` and shows the server total.

**Save and share a build**

1. `POST /builds` with the configuration; the API re-prices it and stores it.
2. Response holds a public `shareCode` (`/b/7KQ2XM`) and a private `editToken` kept in localStorage.
3. Anyone with the link opens it read-only; only the edit token can update or delete it.

**Enquire**

1. `POST /enquiries` with contact details, consent and the build (or `buildId`).
2. API stores the lead, emails the studio, optionally posts to a CRM webhook.
3. Staff see and update it in the admin inbox.

**AI photo edit ("See it for real")**

1. Frontend uploads the photo with a pre-signed URL (`POST /uploads`), then calls `POST /ai/visualize`.
2. API checks the spending budget, creates a job, returns `202` with a `jobId`.
3. Worker calls the image model, stores the result, marks the job done.
4. Frontend polls `GET /ai/jobs/{jobId}` (every 2 s, up to 2 min).

## 2.3 Technology choices

| Concern | Choice | Why | Alternatives considered |
|---|---|---|---|
| API framework | **NestJS** (TypeScript, Node 20) | Clear module structure for a growing team; validation, guards and OpenAPI generation built in; same language as the frontend | Next.js route handlers (simpler, but mixes concerns and has short serverless time limits for AI); Express (less structure) |
| Database | **PostgreSQL 16** | Relational data (vehicles × parts × compatibility), strong constraints, JSON columns for configurations | MongoDB (weaker for the compatibility matrix and reporting) |
| ORM | **Prisma** | Typed queries, migrations, readable schema | Drizzle, TypeORM |
| Validation | **class-validator** DTOs (Nest) + shared **Zod** types for the frontend | Same rules on both sides | — |
| Files | **Cloudflare R2** (S3-compatible) + CDN | Cheap egress for large 3D models; pre-signed uploads | AWS S3 + CloudFront |
| Queue and rate limits | **Redis + BullMQ** | AI image jobs take 10–100 s; durable retries; shared counters across instances | Database polling |
| Email | **Resend** (or AWS SES) | Simple API, good deliverability | SMTP |
| Auth (admin only) | Email + password, **JWT** access token (15 min) + refresh token (7 days, rotated) | Small staff team, no SSO needed yet | Clerk / Auth0 (paid) |
| API docs | **OpenAPI 3.1** generated by `@nestjs/swagger`, served at `/docs` | One contract for frontend, backend and testers | — |
| Hosting | Frontend on **Vercel**; API and worker on **Railway** or **Render**; DB on **Neon** or Railway Postgres | Low ops effort for a small team | AWS ECS/RDS (more control, more work) |
| Monitoring | **Sentry** (errors) + structured JSON logs | Find failures fast | Datadog |

## 2.4 Decision log

| # | Decision | Status |
|---|---|---|
| D1 | Separate backend service instead of Next.js API routes | Proposed |
| D2 | PostgreSQL + Prisma | Proposed |
| D3 | Prices calculated only on the server; frontend total is an estimate | Proposed |
| D4 | No customer accounts in release 1; builds use share codes + edit tokens | Proposed |
| D5 | 3D models move from the git repo to object storage + CDN | Proposed |
| D6 | AI calls only from the worker, with a persistent monthly budget | Proposed |

---

# 3. Data model

PostgreSQL schema for the backend (proposed). It mirrors the data the frontend already uses in
`src/types/vehicle.ts`, `src/types/product.ts` and `src/data/*.ts`, so the catalogue can be migrated
with a one-off seed script.

## 3.1 Entity diagram

```mermaid
erDiagram
  BRAND ||--o{ VEHICLE : makes
  VEHICLE ||--o{ GENERATION : has
  VEHICLE }o--|| VEHICLE_ASSET : "shown with"
  VEHICLE_ASSET ||--o{ ASSET_SUPPORT : "supports slot"
  CATEGORY ||--o{ PRODUCT : groups
  PRODUCT ||--o{ FINISH : offers
  BUILD }o--|| VEHICLE : for
  BUILD ||--o{ BUILD_ITEM : contains
  BUILD_ITEM }o--|| PRODUCT : uses
  BUILD }o--o| PAINT : painted
  ENQUIRY }o--o| BUILD : about
  ENQUIRY ||--o{ ENQUIRY_NOTE : has
  ADMIN_USER ||--o{ ENQUIRY_NOTE : writes
  UPLOAD ||--o{ AI_JOB : input
  AI_JOB }o--o| VEHICLE : for
```

## 3.2 Catalogue

**brand**

| Column | Type | Notes |
|---|---|---|
| id | text PK | `porsche`, `volvo` |
| name | text | "Porsche" |
| tagline | text | |
| accent_color | text | hex, used by the UI |
| sort_order | int | |

**vehicle**

| Column | Type | Notes |
|---|---|---|
| id | text PK | `porsche-911`, `volvo-s90` (URL slug) |
| brand_id | text FK → brand | |
| model | text | "911" |
| body | enum `sedan`, `suv`, `coupe` | |
| default_generation | text | "992" |
| base_price | int | INR |
| power | text | "379 hp" |
| asset_id | text FK → vehicle_asset | several vehicles may share one 3D body |
| photo_url | text | CDN URL |
| photo_credit | jsonb | title, artist, licence, source page |
| status | enum `draft`, `published`, `archived` | only `published` is public |
| created_at, updated_at | timestamptz | |

**generation**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| vehicle_id | text FK | |
| code | text | "991", "992" |
| label | text | "992 (2019–present)" |
| year_from, year_to | int | |

**vehicle_asset** (one 3D model and how to use it)

| Column | Type | Notes |
|---|---|---|
| id | text PK | `volvo-s90-v3` |
| label | text | |
| model_url | text | CDN URL of the GLB |
| file_size_bytes | int | for the size budget |
| gpu_texture_mb | numeric | from the pipeline report |
| stand_in | boolean | true for generic bodies |
| config | jsonb | everything the 3D viewer needs that is not relational: `forward`, `scale`, wheel nodes, attachment points, surfaces, opening panels (`doors`), `cabin`, `interior` sets, `factoryPaint`, `groundShadow`, `defaultLighting`. Same shape as `VehicleAssetConfig` today. |
| credit | text | licence credit line |
| licence | text | `CC BY-SA 4.0`, `CGTrader Royalty Free`, … |
| licence_checked | boolean | must be true before `published` |

**asset_support** (what each 3D body can show)

| Column | Type | Notes |
|---|---|---|
| asset_id | text FK | composite PK with `component` |
| component | text | `wheels`, `spoiler`, `exhaust`, `interior`, … |
| support | enum `replace`, `attach`, `material`, `none` | |
| note | text | shown when `none` |

**category**

| Column | Type | Notes |
|---|---|---|
| id | text PK | `wheels`, `spoilers`, `bumpers`, `skirts`, `lighting`, `accessories`, `interior` |
| name, blurb | text | |
| sort_order | int | |

**product**

| Column | Type | Notes |
|---|---|---|
| id | text PK | `wheels-amg-twin` |
| category_id | text FK | |
| slot | enum (14 slots, see `SlotId`) | one product per slot in a build |
| component | text | matched against `asset_support.component` |
| name, description | text | |
| price | int | INR |
| impl | jsonb | how the viewer realises it: `{kind:'wheels', model}`, `{kind:'attach', model, attachment, span}`, `{kind:'material', overrides}`, `{kind:'interior', set}` |
| thumb | jsonb | thumbnail kind and design |
| default_finish_id | text | |
| status | enum `draft`, `published`, `archived` | |

**finish**

| Column | Type | Notes |
|---|---|---|
| id | text | composite PK with `product_id` |
| product_id | text FK | |
| name | text | "Satin Bronze" |
| color | text | hex |
| metalness, roughness, clearcoat | numeric | |
| price | int | extra over the product price, INR |

**paint**

| Column | Type | Notes |
|---|---|---|
| id | text PK | `factory`, `racing-red`, `custom` |
| name | text | |
| color | text | hex |
| metalness, roughness, clearcoat, clearcoat_roughness | numeric | |
| price | int | INR; `custom` = paint-to-sample price |

## 3.3 Builds and leads

**build** (a saved configuration)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| share_code | text unique | 6–8 characters, e.g. `7KQ2XM` |
| edit_token_hash | text | SHA-256 of the edit token; the token itself is never stored |
| vehicle_id | text FK | |
| generation_code | text | |
| year | int | |
| paint | jsonb | `{id, color?, finish?}` |
| total | int | server-calculated, INR |
| price_version | int | catalogue price version used for `total` |
| created_at, updated_at | timestamptz | |
| expires_at | timestamptz | null = keep; anonymous builds untouched for 12 months can be purged |

**build_item**

| Column | Type | Notes |
|---|---|---|
| build_id | uuid FK | composite PK with `slot` |
| slot | enum | |
| product_id | text FK | |
| finish_id | text | |
| unit_price | int | price at save time, INR |

**enquiry** (a lead)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| reference | text unique | human reference, `ENQ-2026-000123` |
| build_id | uuid FK nullable | |
| build_snapshot | jsonb | full configuration and line items at enquiry time (prices can change later) |
| name | text | |
| email | text | |
| phone | text | E.164 |
| city | text | |
| preferred_contact | enum `phone`, `email`, `whatsapp` | |
| message | text | max 2,000 characters |
| consent_marketing | boolean | |
| consent_at | timestamptz | |
| source | text | `configurator`, `identify`, `visualize` |
| utm | jsonb | campaign tags |
| status | enum `new`, `contacted`, `quoted`, `won`, `lost`, `spam` | |
| assigned_to | uuid FK → admin_user | |
| created_at, updated_at | timestamptz | |

**enquiry_note**: id, enquiry_id, author_id, body, created_at.

## 3.4 Uploads, AI and admin

**upload**: id, kind (`identify_photo`, `visualize_photo`, `asset_model`, `vehicle_photo`), storage_key,
media_type, size_bytes, created_at, expires_at (customer photos: 24 h).

**ai_job**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| kind | enum `identify`, `visualize` | |
| status | enum `queued`, `running`, `succeeded`, `failed` | |
| input | jsonb | upload ids, vehicle id, configuration |
| result | jsonb | identify result, or output image key |
| provider, model | text | `gemini`, `gemini-3.1-flash-image` |
| cost_usd | numeric(10,4) | estimated cost of the call |
| error_code | text | |
| client_fingerprint | text | hashed IP + user agent, for per-visitor limits |
| created_at, finished_at | timestamptz | |

**admin_user**: id, email (unique), name, password_hash (argon2id), role (`admin`, `staff`),
last_login_at, disabled.

**refresh_token**: id, user_id, token_hash, expires_at, revoked_at.

**audit_log**: id, actor_id, action (`product.update`, …), entity, entity_id, before, after, created_at.

## 3.5 Indexes and rules

- `vehicle (brand_id, status)`, `product (category_id, slot, status)`, `enquiry (status, created_at desc)`,
  `ai_job (status, created_at)`, `build (share_code)` unique.
- A build may hold at most one item per slot (composite primary key).
- A product can be added to a build only if the vehicle's asset supports its `component`
  (or it is accepted as "preview only"; the API returns that flag).
- Prices are integers in INR; totals are always recalculated on the server.

---

# 4. API reference

REST API for the MODIFIED backend (proposed, version 1). The machine-readable contract is
[openapi.yaml](#appendix-openapi-specification); this page explains it for people.

## 4.1 Basics

| Item | Value |
|---|---|
| Base URL | `https://api.modified.example/api/v1` (production), `http://localhost:4000/api/v1` (local) |
| Format | JSON, UTF-8. Field names in camelCase. |
| Money | Integer INR (`185000` = ₹1,85,000) |
| Dates | ISO 8601 UTC |
| Auth | Public endpoints: none. Admin endpoints: `Authorization: Bearer <accessToken>` |
| Interactive docs | `GET /docs` (Swagger UI), `GET /docs/openapi.json` |
| Versioning | Path (`/api/v1`). Breaking changes go to `/api/v2`; additive changes stay in v1. |

### Errors

Every error has the same shape and an HTTP status that matches it:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Phone number is not valid.",
    "details": [{ "field": "phone", "issue": "invalid_format" }]
  },
  "requestId": "req_01JDX4T8M2"
}
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `bad_request`, `validation_failed` | Malformed JSON or invalid fields |
| 401 | `unauthorized` | Missing or expired token (admin) |
| 403 | `forbidden`, `invalid_edit_token` | Not allowed |
| 404 | `not_found` | Unknown id or share code |
| 409 | `conflict`, `incompatible_part` | Duplicate, or a part this car cannot take |
| 413 | `payload_too_large` | Upload over the limit |
| 422 | `unprocessable_photo` | AI could not use the photo |
| 429 | `rate_limited`, `ai_budget_exhausted` | Too many requests, or the AI spending cap is reached |
| 502 / 503 | `upstream_error`, `not_configured` | AI provider failed or is not set up |

### Pagination, caching, limits

- Lists use cursor pagination: `?limit=20&cursor=<opaque>`; responses include `nextCursor` (null at the end).
- Public catalogue responses send `Cache-Control: public, max-age=300, stale-while-revalidate=3600` and an `ETag`.
- `POST /enquiries` and `POST /builds` accept an `Idempotency-Key` header so a double click does not create two.
- Rate limits per visitor (IP + user agent): 120 requests/min overall; 5 enquiries/hour; 10 identify and
  5 visualize requests/day. Limit headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

## 4.2 Endpoints

### Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ "status": "ok", "version": "1.0.0", "db": "ok", "queue": "ok" }` |

### Catalogue (public)

| Method | Path | Purpose |
|---|---|---|
| GET | `/brands` | All brands with vehicle counts |
| GET | `/vehicles` | Published vehicles. Filters: `brand`, `body`, `q` (search), `limit`, `cursor` |
| GET | `/vehicles/{vehicleId}` | One vehicle with generations, photo and its 3D asset config |
| GET | `/vehicles/{vehicleId}/compatibility` | For every product: `supported` (`replace`, `attach`, `material`, `none`) and a note |
| GET | `/categories` | Option categories and their slots |
| GET | `/products` | Published products. Filters: `category`, `slot`, `vehicleId` (adds `support` per product) |
| GET | `/products/{productId}` | One product with finishes |
| GET | `/paints` | Paint options, including paint-to-sample price |

Example: `GET /vehicles/volvo-s90`

```json
{
  "id": "volvo-s90",
  "brand": { "id": "volvo", "name": "Volvo" },
  "model": "S90",
  "body": "sedan",
  "basePrice": 6825000,
  "power": "250 hp",
  "defaultGeneration": "SPA",
  "generations": [{ "code": "SPA", "label": "SPA (2016–present)", "yearFrom": 2016, "yearTo": 2025 }],
  "photo": { "url": "https://cdn.modified.example/photos/volvo-s90.jpg", "credit": "Chanokchon, CC BY-SA 4.0" },
  "asset": {
    "id": "volvo-s90-v3",
    "modelUrl": "https://cdn.modified.example/models/volvo-s90-v3.glb",
    "fileSizeBytes": 13105604,
    "standIn": false,
    "config": { "forward": "+z", "doors": ["…"], "cabin": { "eye": [0.24, 1.17, -0.12], "look": [0.05, 0.92, 0.75] } }
  }
}
```

### Pricing (public)

| Method | Path | Purpose |
|---|---|---|
| POST | `/quotes` | Price a configuration. Returns line items and the total. Nothing is stored. |

Request:

```json
{
  "vehicleId": "volvo-s90",
  "generation": "SPA",
  "year": 2022,
  "paint": { "id": "custom", "color": "#31506e", "finish": "metallic" },
  "selections": {
    "wheels": { "productId": "wheels-forged-turbine", "finishId": "polished" },
    "spoiler": { "productId": "spoiler-carbon-ducktail" }
  }
}
```

Response `200`:

```json
{
  "currency": "INR",
  "lineItems": [
    { "slot": "paint", "name": "Paint to Sample", "finish": "Metallic", "price": 135000 },
    { "slot": "wheels", "productId": "wheels-forged-turbine", "name": "Forged Turbine 7-Spoke 21\"", "finish": "Polished", "price": 107000 },
    { "slot": "spoiler", "productId": "spoiler-carbon-ducktail", "name": "Carbon-Fibre Ducktail", "price": 28000 }
  ],
  "total": 270000,
  "warnings": [],
  "priceVersion": 14
}
```

`warnings` lists parts this car's 3D model can only show as a preview (code `preview_only`), and parts
that are no longer sold (`discontinued`).

### Builds (public)

| Method | Path | Purpose |
|---|---|---|
| POST | `/builds` | Save a configuration. Returns `id`, `shareCode`, `shareUrl`, `editToken` (shown once), and the quote |
| GET | `/builds/{shareCode}` | Open a shared build (read-only), re-priced at today's prices |
| PUT | `/builds/{shareCode}` | Replace the build. Header `X-Edit-Token` required |
| DELETE | `/builds/{shareCode}` | Delete it. Header `X-Edit-Token` required. `204` |

The frontend keeps `{ shareCode, editToken }` in localStorage so "Save configuration" keeps working as today.

### Enquiries (public)

| Method | Path | Purpose |
|---|---|---|
| POST | `/enquiries` | Create a lead. Returns `201` with `reference` (`ENQ-2026-000123`) |

Request:

```json
{
  "name": "Ravi Kumar",
  "email": "ravi@example.com",
  "phone": "+919812345678",
  "city": "Mumbai",
  "preferredContact": "whatsapp",
  "message": "Interested in the wheels and paint, can you install next month?",
  "buildShareCode": "7KQ2XM",
  "consentMarketing": false,
  "source": "configurator",
  "utm": { "source": "instagram", "campaign": "dec-launch" }
}
```

Rules: `name` 2–80 characters; at least one of `email` or `phone`; `message` ≤ 2,000 characters; either
`buildShareCode` or an inline `build` configuration. A honeypot field `website` must be empty (spam).

### Uploads and AI (public)

| Method | Path | Purpose |
|---|---|---|
| POST | `/uploads` | Get a pre-signed URL to upload one photo (`kind`, `mediaType`, `sizeBytes`). Max 8 MB; JPEG, PNG, WebP. Photos are deleted after 24 h. |
| POST | `/ai/identify` | Identify the car in 1–8 uploaded photos. Synchronous, ~5–30 s. Returns the `IdentifyResult` (make, model, generation, year, catalogue match, paint, wheels, existing mods, photo advice) |
| POST | `/ai/visualize` | Apply a configuration to an uploaded photo. Returns `202` with `jobId` |
| GET | `/ai/jobs/{jobId}` | Job status: `queued`, `running`, `succeeded` (with `resultUrl`), `failed` (with `error`) |

`POST /ai/visualize` request:

```json
{
  "uploadId": "upl_01JDX5B3QW",
  "vehicleId": "volvo-s90",
  "config": { "paint": { "id": "racing-red" }, "selections": { "wheels": { "productId": "wheels-sport-y" } } }
}
```

The prompt is always built on the server from catalogue data; no free text from the browser reaches the model.

### Admin (staff only, Bearer token)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Email + password → `accessToken` (15 min) + `refreshToken` (7 days) |
| POST | `/auth/refresh` | New token pair; the old refresh token is revoked |
| POST | `/auth/logout` | Revoke the refresh token |
| GET | `/auth/me` | Current staff user |
| GET / POST | `/admin/vehicles` | List (all statuses) / create |
| GET / PATCH / DELETE | `/admin/vehicles/{id}` | Read / update / archive |
| GET / POST | `/admin/products` | List / create |
| GET / PATCH / DELETE | `/admin/products/{id}` | Read / update / archive |
| PUT | `/admin/products/{id}/finishes` | Replace a product's finishes |
| GET / PATCH | `/admin/paints`, `/admin/paints/{id}` | Manage paints |
| GET / POST | `/admin/assets` | List 3D assets / register an uploaded GLB with its config |
| PATCH | `/admin/assets/{id}` | Update config, licence, `licenceChecked` |
| GET | `/admin/enquiries` | Inbox. Filters: `status`, `from`, `to`, `q`, `assignedTo` |
| GET / PATCH | `/admin/enquiries/{id}` | Read; change `status`, `assignedTo` |
| POST | `/admin/enquiries/{id}/notes` | Add an internal note |
| GET | `/admin/enquiries/export.csv` | CSV export |
| GET | `/admin/stats` | Builds, enquiries and conversion by day; top vehicles and parts |
| GET | `/admin/ai-usage` | AI calls and estimated cost this month vs the budget |

Roles: `admin` can do everything; `staff` can read the catalogue and manage enquiries but not change
prices, assets or users.

## 4.3 Frontend changes needed

| Frontend today | After |
|---|---|
| `src/data/vehicles.ts`, `products.ts`, `demoAssets.ts` imported directly | Fetched from `/vehicles`, `/products`, `/paints` (kept as a fallback seed in development) |
| `useConfigurator` saves to localStorage | `POST /builds`; keeps `shareCode` + `editToken` locally |
| Total from `lineItems` in the browser | Estimate in the browser, confirmed by `POST /quotes` |
| `enquire()` opens `mailto:` | Enquiry form → `POST /enquiries` → confirmation with reference |
| `/api/identify`, `/api/visualize` in Next.js | `/ai/identify`, `/ai/visualize` + job polling on the backend |
| `public/models/**`, `public/photos/**` | CDN URLs from the API |

---

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

---

# 6. 3D asset pipeline

How a car goes from a source file (Blender `.blend` or a downloaded GLB) to the website. Every step is a
script in `scripts/`, so it can be re-run when the source changes.

## 6.1 Budgets per car

| Measure | Limit | Why |
|---|---|---|
| Download (GLB) | ≤ 15 MB | Loads in a few seconds on 4G |
| GPU texture memory | ≤ 200 MB | The original Volvo used ~920 MB and strained laptops |
| Triangles | ≤ 1.5 M | Smooth orbiting on mid-range laptops |
| Textures | 2048 px only for close-up parts (tyres, rims, front seats, dashboard); 1024 px for the rest | |

## 6.2 Steps

1. **Source and licence.** Get the model (CGTrader, Sketchfab, TurboSquid, or a commissioned model).
   Record the author, licence and source page. Do not publish until the licence allows commercial use.
2. **Export from Blender** with a per-car script that separates opening panels, adds hinge points and
   (if needed) builds missing parts:
   - Volvo S90: `scripts/export-volvo-s90.py`
   - Porsche 911 v2: `scripts/export-porsche-911-v2.py` (separates doors and front lid, adds a simple cabin)

   ```bash
   blender -b ~/Codes/carPorsche.blend --python scripts/export-porsche-911-v2.py
   ```
3. **Prepare:** rename and split wheels and brakes, scale to the real length, centre the car, put the tyres
   on the ground, compress geometry (Draco).

   ```bash
   node scripts/prepare-vehicles.mjs porsche-911-v2
   ```
4. **Compress textures for the GPU** (KTX2 / Basis Universal): colour maps ETC1S, normal maps UASTC, data
   maps ETC1S marked linear.

   ```bash
   node scripts/optimize-volvo-v3.mjs public/models/vehicles/<car>.glb public/models/vehicles/<car>.ktx.glb
   mv public/models/vehicles/<car>.ktx.glb public/models/vehicles/<car>.glb
   ```
5. **Configure** the car in `src/data/demoAssets.ts` (moving to the `vehicle_asset.config` column in the
   database): wheel nodes, attachment points for parts, surface materials, opening panels and their
   hotspots, cabin camera, factory paint.
6. **Check in the browser:** every camera view, every opening panel, interior view, one wheel and one body
   kit fitted, on a phone and a laptop.

## 6.3 Cars done

| Car | Source | Licence | Opening parts | Interior |
|---|---|---|---|---|
| Volvo S90 v3 | CGTrader, "Volvo S90" by lazercar | **Not checked yet** | Doors, boot, fuel flap | Original, 3 trim colours |
| Porsche 911 v2 | Sketchfab, "(FREE) Porsche 911 Carrera 4S" by Lionsharp Studios | CC BY-SA 4.0 (credit required) | Doors, front lid | Simple cabin built by script |
| BMW M4 | Sketchfab, "BMW M4 Competition 2021" by 3DCars4U | CC BY 4.0 (credit required) | — | — |

## 6.4 Lessons learned

- GPU-compressed textures must carry the right colour flag: roughness and normal maps marked as sRGB make
  surfaces look glossy.
- Panels that will open need a dark inner face; otherwise an open door looks hollow.
- Name hinge nodes uniquely: the 911 source already had a node called `boot`, so the lid hinge is `frunk`.
- Keep the car's own tyres when fitting aftermarket rims; they look far more real than generated tyres.

---

# 7. Security, privacy and costs

## 7.1 Security

| Area | Measure |
|---|---|
| Transport | HTTPS only; HSTS; API sets security headers (helmet) |
| CORS | Only the production and staging frontend origins |
| Input | Every request validated against its DTO; unknown fields rejected; size limits on bodies and uploads |
| Admin auth | Argon2id password hashes; 15-minute JWT access tokens; rotated 7-day refresh tokens; login limited to 5 tries per 15 minutes per IP and account |
| Roles | `admin` (everything) and `staff` (catalogue read, enquiries); checked on every admin route |
| Builds | Public by share code; changes need the edit token, stored only as a SHA-256 hash |
| Spam | Honeypot field and per-visitor rate limits on enquiries; Cloudflare Turnstile added if spam appears |
| AI prompts | Built only from catalogue data on the server; no customer free text reaches the model |
| Secrets | Hosting platform secret store; never in git or in frontend `NEXT_PUBLIC_*` variables |
| Audit | Every admin change to prices, products and assets is written to `audit_log` |
| Dependencies | Dependabot updates; `npm audit` in CI |

## 7.2 Customer data and privacy

| Data | Kept for | Notes |
|---|---|---|
| Enquiries (name, email, phone, city, message) | 24 months, then anonymised | Needed to follow up and report; deletable on request |
| Saved builds | 12 months after last update | Contain no personal data |
| Uploaded car photos | 24 hours | Used only for the AI request, then deleted |
| AI-generated images | 24 hours | Download link expires |
| Visitor fingerprint (hashed IP + user agent) | 30 days | Rate limiting only |

- The enquiry form asks for explicit consent before marketing contact; consent time is stored.
- Applicable law: India's Digital Personal Data Protection Act 2023 (and GDPR if EU visitors are targeted).
  **Open question:** confirm the privacy policy text with legal before launch.

## 7.3 Running costs (estimates)

Approximate monthly costs at launch scale (a few thousand visitors, a few hundred AI requests). Check
current provider pricing before committing.

| Item | Service | Approx. per month |
|---|---|---|
| Frontend hosting | Vercel Pro | $20 |
| API + worker | Railway / Render | $10–$25 |
| PostgreSQL | Neon / Railway | $0–$20 |
| Redis | Upstash / Railway | $0–$10 |
| Object storage + CDN | Cloudflare R2 (no egress fees) | $1–$5 |
| Email | Resend | $0–$20 |
| Error tracking | Sentry (team plan) | $0–$26 |
| AI | Gemini image edits and identify, capped by `AI_MONTHLY_BUDGET_USD` | Set by the cap (suggested $50) |
| **Total** | | **about $30–$175 + AI cap** |

AI cost control:

1. Hard monthly budget in the database (`AI_MONTHLY_BUDGET_USD`); requests return `429 ai_budget_exhausted` when reached.
2. Per-visitor daily limits (10 identify, 5 visualize).
3. Staff see spend vs budget at `GET /admin/ai-usage`; an email goes out at 80%.

## 7.4 3D model and photo licences

| Asset | Licence | Action needed |
|---|---|---|
| Volvo S90 model (CGTrader, lazercar) | Unknown | **Check the CGTrader licence allows commercial use before any client demo** |
| Porsche 911 model (Sketchfab, Lionsharp Studios) | CC BY-SA 4.0 | Keep the visible credit; derivative model files must stay under the same licence |
| BMW M4 model (Sketchfab, 3DCars4U) | CC BY 4.0 | Keep the visible credit |
| Car photos (Wikimedia Commons) | CC BY / CC BY-SA | Credited on the Credits page |
| Location HDRs (Poly Haven) | CC0 | None |
| Brand names and logos | Trademarks | The site states it is not affiliated with any manufacturer; confirm with legal for commercial use |

---

# 8. Roadmap

Plan for one lead, one designer and one backend/frontend developer. Estimates assume the developer
works full time on this project; they move if the scope decisions in the product overview change.

## 8.1 Phases

```mermaid
gantt
  dateFormat YYYY-MM-DD
  axisFormat %d %b
  section Phase 0 · Stabilise
  Commit work, remove old versions, licences      :p0a, 2026-11-30, 5d
  Real-device testing and fixes                    :p0b, after p0a, 5d
  section Phase 1 · Core backend
  API skeleton, DB schema, seed, CI                :p1a, 2026-12-07, 5d
  Catalogue + pricing endpoints                    :p1b, after p1a, 4d
  Builds + share links                             :p1c, after p1b, 3d
  Enquiries + email + admin inbox                  :p1d, after p1c, 5d
  section Phase 2 · Frontend on the API
  Frontend reads catalogue, saves builds, enquiry form :p2a, after p1d, 7d
  section Phase 3 · AI and assets
  AI on backend with job queue and budget          :p3a, after p2a, 5d
  3D models and photos to R2 + CDN                 :p3b, after p2a, 3d
  section Phase 4 · Admin and launch
  Admin catalogue editing, stats                   :p4a, after p3a, 6d
  Security review, load test, launch               :p4b, after p4a, 4d
```

| Phase | Outcome | Effort (developer days) |
|---|---|---|
| 0. Stabilise | Clean repository; only final car versions; licences confirmed; works on iPhone, Android and a laptop | 5–10 |
| 1. Core backend | API running on staging: catalogue, pricing, saved builds, enquiries with email and admin inbox | 15–17 |
| 2. Frontend on the API | Website reads the catalogue from the API, saves shareable builds, sends real enquiries | 5–7 |
| 3. AI and assets | AI features behind the backend with a monthly cap; 3D files served from the CDN | 6–8 |
| 4. Admin and launch | Staff can edit cars, parts and prices; security review; production launch | 8–10 |
| **Total** | | **about 40–50 developer days (8–10 weeks)** |

## 8.2 Milestones

| Milestone | Definition of done | Target |
|---|---|---|
| M0 Demo-ready | Phase 0 done; demo link safe to show clients | 2 weeks |
| M1 First backend | Enquiries stored and emailed; builds shareable by link | 5 weeks |
| M2 Beta | Frontend fully on the API; AI capped; staging tested by the team | 7 weeks |
| M3 Launch | Admin editing, security review passed, production live | 9–10 weeks |

## 8.3 Who does what

| Person | Phase 0 | Phase 1–2 | Phase 3–4 |
|---|---|---|---|
| Lead | Cleanup, licences, scope decisions | API review, priorities, client feedback | 3D pipeline for new cars, launch checklist |
| Designer | Figma file for current pages | Enquiry form, confirmation, share page, empty and error states | Admin screens, launch visuals |
| Developer | Real-device testing and fixes | Backend modules, frontend integration | AI queue, CDN move, admin, tests |

## 8.4 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Volvo model licence does not allow commercial use | Must replace the car | Check now; budget for a paid model |
| Only 3 cars are truly 3D | Clients expect their car | Agree a launch list; plan 1–2 days per new car |
| Low-end phones struggle with 3D | Lost customers | Size budgets (section 6.1); lighter mode for phones |
| AI costs grow with traffic | Unplanned spend | Monthly cap and per-visitor limits |
| One developer | Delays when unavailable | Docs, small pull requests, reviews by the lead |

---

# Appendix: OpenAPI specification

The full API contract (OpenAPI 3.1). Save the block below as `openapi.yaml` to import into Postman or Swagger UI.

```yaml
openapi: 3.1.0
info:
  title: MODIFIED API
  version: 1.0.0-draft
  summary: Backend for the MODIFIED 3D car configurator (proposed, not built yet).
  description: |
    Catalogue, server-side pricing, saved and shareable builds, enquiries (leads), AI photo features
    and a staff admin area. Money is integer INR. Dates are ISO 8601 UTC.
    Human-readable guide: docs/04-api-reference.md.
servers:
  - url: http://localhost:4000/api/v1
    description: Local development
  - url: https://api.modified.example/api/v1
    description: Production (placeholder domain)
tags:
  - name: Health
  - name: Catalogue
  - name: Pricing
  - name: Builds
  - name: Enquiries
  - name: AI
  - name: Auth
  - name: Admin

paths:
  /health:
    get:
      tags: [Health]
      summary: Service health
      operationId: getHealth
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, enum: [ok, degraded] }
                  version: { type: string, example: 1.0.0 }
                  db: { type: string, enum: [ok, down] }
                  queue: { type: string, enum: [ok, down] }

  /brands:
    get:
      tags: [Catalogue]
      summary: List brands
      operationId: listBrands
      responses:
        '200':
          description: Brands
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Brand' }

  /vehicles:
    get:
      tags: [Catalogue]
      summary: List published vehicles
      operationId: listVehicles
      parameters:
        - { name: brand, in: query, schema: { type: string }, example: porsche }
        - { name: body, in: query, schema: { $ref: '#/components/schemas/BodyStyle' } }
        - { name: q, in: query, schema: { type: string }, description: Search by brand or model name }
        - $ref: '#/components/parameters/Limit'
        - $ref: '#/components/parameters/Cursor'
      responses:
        '200':
          description: A page of vehicles
          content:
            application/json:
              schema:
                type: object
                required: [items, nextCursor]
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/VehicleSummary' }
                  nextCursor: { type: [string, 'null'] }

  /vehicles/{vehicleId}:
    get:
      tags: [Catalogue]
      summary: Get one vehicle with its 3D asset
      operationId: getVehicle
      parameters: [{ $ref: '#/components/parameters/VehicleId' }]
      responses:
        '200':
          description: Vehicle
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Vehicle' }
        '404': { $ref: '#/components/responses/NotFound' }

  /vehicles/{vehicleId}/compatibility:
    get:
      tags: [Catalogue]
      summary: How each product can be shown on this vehicle's 3D model
      operationId: getCompatibility
      parameters: [{ $ref: '#/components/parameters/VehicleId' }]
      responses:
        '200':
          description: One entry per published product
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  required: [productId, support]
                  properties:
                    productId: { type: string, example: wheels-amg-twin }
                    support: { $ref: '#/components/schemas/Support' }
                    note: { type: [string, 'null'] }
        '404': { $ref: '#/components/responses/NotFound' }

  /categories:
    get:
      tags: [Catalogue]
      summary: Option categories and their slots
      operationId: listCategories
      responses:
        '200':
          description: Categories
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Category' }

  /products:
    get:
      tags: [Catalogue]
      summary: List published products
      operationId: listProducts
      parameters:
        - { name: category, in: query, schema: { type: string }, example: wheels }
        - { name: slot, in: query, schema: { $ref: '#/components/schemas/Slot' } }
        - { name: vehicleId, in: query, schema: { type: string }, description: Adds `support` for this vehicle to each product }
      responses:
        '200':
          description: Products
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Product' }

  /products/{productId}:
    get:
      tags: [Catalogue]
      summary: Get one product
      operationId: getProduct
      parameters:
        - { name: productId, in: path, required: true, schema: { type: string } }
      responses:
        '200':
          description: Product
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Product' }
        '404': { $ref: '#/components/responses/NotFound' }

  /paints:
    get:
      tags: [Catalogue]
      summary: Paint options
      operationId: listPaints
      responses:
        '200':
          description: Paints, including `custom` (paint to sample)
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Paint' }

  /quotes:
    post:
      tags: [Pricing]
      summary: Price a configuration (nothing is stored)
      operationId: createQuote
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Configuration' }
      responses:
        '200':
          description: Server-calculated price
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Quote' }
        '400': { $ref: '#/components/responses/ValidationFailed' }
        '409': { $ref: '#/components/responses/Conflict' }

  /builds:
    post:
      tags: [Builds]
      summary: Save a build
      operationId: createBuild
      parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Configuration' }
      responses:
        '201':
          description: Saved. `editToken` is returned only here; keep it to update or delete the build.
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/Build'
                  - type: object
                    required: [editToken]
                    properties:
                      editToken: { type: string, example: et_4f9c2a7d1b8e4c6f9a0d }
        '400': { $ref: '#/components/responses/ValidationFailed' }
        '429': { $ref: '#/components/responses/RateLimited' }

  /builds/{shareCode}:
    parameters:
      - { name: shareCode, in: path, required: true, schema: { type: string, pattern: '^[A-Z0-9]{6,8}$' }, example: 7KQ2XM }
    get:
      tags: [Builds]
      summary: Open a shared build (re-priced at current prices)
      operationId: getBuild
      responses:
        '200':
          description: Build
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Build' }
        '404': { $ref: '#/components/responses/NotFound' }
    put:
      tags: [Builds]
      summary: Replace a build
      operationId: updateBuild
      parameters: [{ $ref: '#/components/parameters/EditToken' }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Configuration' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Build' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotFound' }
    delete:
      tags: [Builds]
      summary: Delete a build
      operationId: deleteBuild
      parameters: [{ $ref: '#/components/parameters/EditToken' }]
      responses:
        '204': { description: Deleted }
        '403': { $ref: '#/components/responses/Forbidden' }

  /enquiries:
    post:
      tags: [Enquiries]
      summary: Send an enquiry (create a lead)
      operationId: createEnquiry
      parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/EnquiryCreate' }
      responses:
        '201':
          description: Received
          content:
            application/json:
              schema:
                type: object
                required: [id, reference, createdAt]
                properties:
                  id: { type: string, format: uuid }
                  reference: { type: string, example: ENQ-2026-000123 }
                  createdAt: { type: string, format: date-time }
        '400': { $ref: '#/components/responses/ValidationFailed' }
        '429': { $ref: '#/components/responses/RateLimited' }

  /uploads:
    post:
      tags: [AI]
      summary: Get a pre-signed URL to upload one photo
      operationId: createUpload
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [kind, mediaType, sizeBytes]
              properties:
                kind: { type: string, enum: [identify_photo, visualize_photo] }
                mediaType: { type: string, enum: [image/jpeg, image/png, image/webp] }
                sizeBytes: { type: integer, maximum: 8388608 }
      responses:
        '201':
          description: Upload the file with an HTTP PUT to `uploadUrl` before it expires.
          content:
            application/json:
              schema:
                type: object
                required: [uploadId, uploadUrl, expiresAt]
                properties:
                  uploadId: { type: string, example: upl_01JDX5B3QW }
                  uploadUrl: { type: string, format: uri }
                  expiresAt: { type: string, format: date-time }
        '413': { $ref: '#/components/responses/PayloadTooLarge' }
        '429': { $ref: '#/components/responses/RateLimited' }

  /ai/identify:
    post:
      tags: [AI]
      summary: Identify the car in uploaded photos
      operationId: identifyCar
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [uploadIds]
              properties:
                uploadIds:
                  type: array
                  minItems: 1
                  maxItems: 8
                  items: { type: string }
      responses:
        '200':
          description: What the photos show, matched against the catalogue
          content:
            application/json:
              schema: { $ref: '#/components/schemas/IdentifyResult' }
        '400': { $ref: '#/components/responses/ValidationFailed' }
        '422': { $ref: '#/components/responses/UnprocessablePhoto' }
        '429': { $ref: '#/components/responses/RateLimited' }
        '502': { $ref: '#/components/responses/Upstream' }

  /ai/visualize:
    post:
      tags: [AI]
      summary: Start an AI edit of a car photo with the chosen paint and parts
      operationId: startVisualize
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [uploadId, vehicleId, config]
              properties:
                uploadId: { type: string }
                vehicleId: { type: string }
                config:
                  type: object
                  required: [paint]
                  properties:
                    paint: { $ref: '#/components/schemas/PaintChoice' }
                    selections: { $ref: '#/components/schemas/Selections' }
      responses:
        '202':
          description: Job queued; poll `GET /ai/jobs/{jobId}`
          content:
            application/json:
              schema:
                type: object
                required: [jobId, status]
                properties:
                  jobId: { type: string, format: uuid }
                  status: { type: string, enum: [queued] }
        '400': { $ref: '#/components/responses/ValidationFailed' }
        '429': { $ref: '#/components/responses/RateLimited' }
        '503': { $ref: '#/components/responses/Upstream' }

  /ai/jobs/{jobId}:
    get:
      tags: [AI]
      summary: AI job status
      operationId: getAiJob
      parameters:
        - { name: jobId, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: Job
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AiJob' }
        '404': { $ref: '#/components/responses/NotFound' }

  /auth/login:
    post:
      tags: [Auth]
      summary: Staff login
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 12 }
      responses:
        '200':
          description: Token pair
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenPair' }
        '401': { $ref: '#/components/responses/Unauthorized' }
        '429': { $ref: '#/components/responses/RateLimited' }

  /auth/refresh:
    post:
      tags: [Auth]
      summary: Rotate tokens
      operationId: refresh
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [refreshToken]
              properties:
                refreshToken: { type: string }
      responses:
        '200':
          description: New token pair; the old refresh token is revoked
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenPair' }
        '401': { $ref: '#/components/responses/Unauthorized' }

  /auth/logout:
    post:
      tags: [Auth]
      summary: Revoke the refresh token
      operationId: logout
      security: [{ bearerAuth: [] }]
      responses:
        '204': { description: Logged out }

  /auth/me:
    get:
      tags: [Auth]
      summary: Current staff user
      operationId: me
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: User
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AdminUser' }
        '401': { $ref: '#/components/responses/Unauthorized' }

  /admin/vehicles:
    get:
      tags: [Admin]
      summary: List vehicles (all statuses)
      operationId: adminListVehicles
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: status, in: query, schema: { $ref: '#/components/schemas/PublishStatus' } }
        - $ref: '#/components/parameters/Limit'
        - $ref: '#/components/parameters/Cursor'
      responses:
        '200':
          description: Vehicles
          content:
            application/json:
              schema:
                type: object
                properties:
                  items: { type: array, items: { $ref: '#/components/schemas/Vehicle' } }
                  nextCursor: { type: [string, 'null'] }
        '401': { $ref: '#/components/responses/Unauthorized' }
    post:
      tags: [Admin]
      summary: Create a vehicle
      operationId: adminCreateVehicle
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/VehicleWrite' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Vehicle' }
        '400': { $ref: '#/components/responses/ValidationFailed' }
        '403': { $ref: '#/components/responses/Forbidden' }

  /admin/vehicles/{vehicleId}:
    parameters: [{ $ref: '#/components/parameters/VehicleId' }]
    patch:
      tags: [Admin]
      summary: Update a vehicle
      operationId: adminUpdateVehicle
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/VehicleWrite' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Vehicle' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotFound' }
    delete:
      tags: [Admin]
      summary: Archive a vehicle
      operationId: adminArchiveVehicle
      security: [{ bearerAuth: [] }]
      responses:
        '204': { description: Archived }
        '403': { $ref: '#/components/responses/Forbidden' }

  /admin/products:
    get:
      tags: [Admin]
      summary: List products (all statuses)
      operationId: adminListProducts
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Products
          content:
            application/json:
              schema: { type: array, items: { $ref: '#/components/schemas/Product' } }
    post:
      tags: [Admin]
      summary: Create a product
      operationId: adminCreateProduct
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ProductWrite' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Product' }
        '403': { $ref: '#/components/responses/Forbidden' }

  /admin/products/{productId}:
    parameters:
      - { name: productId, in: path, required: true, schema: { type: string } }
    patch:
      tags: [Admin]
      summary: Update a product (price changes bump the catalogue price version)
      operationId: adminUpdateProduct
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ProductWrite' }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Product' }
        '403': { $ref: '#/components/responses/Forbidden' }
    delete:
      tags: [Admin]
      summary: Archive a product
      operationId: adminArchiveProduct
      security: [{ bearerAuth: [] }]
      responses:
        '204': { description: Archived }

  /admin/enquiries:
    get:
      tags: [Admin]
      summary: Enquiry inbox
      operationId: adminListEnquiries
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: status, in: query, schema: { $ref: '#/components/schemas/EnquiryStatus' } }
        - { name: from, in: query, schema: { type: string, format: date } }
        - { name: to, in: query, schema: { type: string, format: date } }
        - { name: q, in: query, schema: { type: string }, description: Name, email, phone or reference }
        - $ref: '#/components/parameters/Limit'
        - $ref: '#/components/parameters/Cursor'
      responses:
        '200':
          description: Enquiries, newest first
          content:
            application/json:
              schema:
                type: object
                properties:
                  items: { type: array, items: { $ref: '#/components/schemas/Enquiry' } }
                  nextCursor: { type: [string, 'null'] }
        '401': { $ref: '#/components/responses/Unauthorized' }

  /admin/enquiries/{enquiryId}:
    parameters:
      - { name: enquiryId, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [Admin]
      summary: Read an enquiry with notes
      operationId: adminGetEnquiry
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Enquiry
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Enquiry' }
        '404': { $ref: '#/components/responses/NotFound' }
    patch:
      tags: [Admin]
      summary: Update status or assignee
      operationId: adminUpdateEnquiry
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                status: { $ref: '#/components/schemas/EnquiryStatus' }
                assignedTo: { type: [string, 'null'], format: uuid }
      responses:
        '200':
          description: Updated
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Enquiry' }

  /admin/enquiries/{enquiryId}/notes:
    post:
      tags: [Admin]
      summary: Add an internal note
      operationId: adminAddEnquiryNote
      security: [{ bearerAuth: [] }]
      parameters:
        - { name: enquiryId, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [body]
              properties:
                body: { type: string, maxLength: 4000 }
      responses:
        '201': { description: Note added }

  /admin/ai-usage:
    get:
      tags: [Admin]
      summary: AI calls and estimated cost this month
      operationId: adminAiUsage
      security: [{ bearerAuth: [] }]
      responses:
        '200':
          description: Usage against the monthly budget
          content:
            application/json:
              schema:
                type: object
                properties:
                  month: { type: string, example: 2026-11 }
                  budgetUsd: { type: number, example: 50 }
                  spentUsd: { type: number, example: 12.4 }
                  calls:
                    type: object
                    properties:
                      identify: { type: integer }
                      visualize: { type: integer }

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  parameters:
    VehicleId:
      name: vehicleId
      in: path
      required: true
      schema: { type: string }
      example: volvo-s90
    Limit:
      name: limit
      in: query
      schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
    Cursor:
      name: cursor
      in: query
      schema: { type: string }
    IdempotencyKey:
      name: Idempotency-Key
      in: header
      required: false
      schema: { type: string, maxLength: 64 }
      description: Repeat requests with the same key within 24 h return the first result.
    EditToken:
      name: X-Edit-Token
      in: header
      required: true
      schema: { type: string }

  responses:
    NotFound:
      description: Not found
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    ValidationFailed:
      description: Invalid request
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Unauthorized:
      description: Missing or expired token
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Forbidden:
      description: Not allowed (role, or wrong edit token)
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Conflict:
      description: Conflict, e.g. a part this vehicle cannot take
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    PayloadTooLarge:
      description: File too large
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    UnprocessablePhoto:
      description: The AI could not use the photo
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    RateLimited:
      description: Too many requests, or the AI budget is used up
      headers:
        RateLimit-Reset: { schema: { type: integer }, description: Seconds until the limit resets }
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Upstream:
      description: AI provider failed or is not configured
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }

  schemas:
    Error:
      type: object
      required: [error, requestId]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code:
              type: string
              enum: [bad_request, validation_failed, unauthorized, forbidden, invalid_edit_token, not_found, conflict,
                     incompatible_part, payload_too_large, unprocessable_photo, rate_limited, ai_budget_exhausted,
                     upstream_error, not_configured, internal]
            message: { type: string }
            details:
              type: array
              items:
                type: object
                properties:
                  field: { type: string }
                  issue: { type: string }
        requestId: { type: string, example: req_01JDX4T8M2 }

    BodyStyle: { type: string, enum: [sedan, suv, coupe] }
    PublishStatus: { type: string, enum: [draft, published, archived] }
    Support: { type: string, enum: [replace, attach, material, none] }
    Slot:
      type: string
      enum: [wheels, spoiler, frontBumper, rearBumper, diffuser, sideSkirts, grille, mirrors, headlights, taillights,
             roof, exhaust, carbonTrim, interior]
    EnquiryStatus: { type: string, enum: [new, contacted, quoted, won, lost, spam] }

    Brand:
      type: object
      required: [id, name]
      properties:
        id: { type: string, example: porsche }
        name: { type: string, example: Porsche }
        tagline: { type: string }
        accentColor: { type: string, example: '#F59E0B' }
        vehicleCount: { type: integer }

    Generation:
      type: object
      properties:
        code: { type: string, example: '992' }
        label: { type: string, example: 992 (2019–present) }
        yearFrom: { type: integer }
        yearTo: { type: integer }

    VehicleSummary:
      type: object
      required: [id, brand, model, body, basePrice]
      properties:
        id: { type: string, example: porsche-911 }
        brand: { $ref: '#/components/schemas/Brand' }
        model: { type: string, example: '911' }
        body: { $ref: '#/components/schemas/BodyStyle' }
        basePrice: { type: integer, example: 18600000 }
        power: { type: string, example: 379 hp }
        photoUrl: { type: string, format: uri }
        fully3d: { type: boolean, description: False when the car is shown on a stand-in 3D body }

    Vehicle:
      allOf:
        - $ref: '#/components/schemas/VehicleSummary'
        - type: object
          properties:
            status: { $ref: '#/components/schemas/PublishStatus' }
            defaultGeneration: { type: string }
            generations: { type: array, items: { $ref: '#/components/schemas/Generation' } }
            photo:
              type: object
              properties:
                url: { type: string, format: uri }
                credit: { type: string }
            asset: { $ref: '#/components/schemas/VehicleAsset' }

    VehicleWrite:
      type: object
      properties:
        id: { type: string, pattern: '^[a-z0-9-]+$' }
        brandId: { type: string }
        model: { type: string }
        body: { $ref: '#/components/schemas/BodyStyle' }
        basePrice: { type: integer, minimum: 0 }
        power: { type: string }
        assetId: { type: string }
        status: { $ref: '#/components/schemas/PublishStatus' }
        generations: { type: array, items: { $ref: '#/components/schemas/Generation' } }

    VehicleAsset:
      type: object
      required: [id, modelUrl, standIn]
      properties:
        id: { type: string, example: volvo-s90-v3 }
        modelUrl: { type: string, format: uri }
        fileSizeBytes: { type: integer, example: 13105604 }
        gpuTextureMb: { type: number, example: 83 }
        standIn: { type: boolean }
        credit: { type: string }
        config:
          type: object
          description: 3D viewer settings, same shape as VehicleAssetConfig in the frontend (wheels, attachments,
            surfaces, doors, cabin, interior sets, factoryPaint, groundShadow, defaultLighting).
          additionalProperties: true

    Category:
      type: object
      properties:
        id: { type: string, example: wheels }
        name: { type: string, example: Wheels }
        blurb: { type: string }
        slots: { type: array, items: { $ref: '#/components/schemas/Slot' } }

    Finish:
      type: object
      required: [id, name, color]
      properties:
        id: { type: string, example: polished }
        name: { type: string, example: Polished }
        color: { type: string, example: '#e8eaed' }
        metalness: { type: number }
        roughness: { type: number }
        clearcoat: { type: number }
        price: { type: integer, description: Extra over the product price, INR, example: 9000 }

    Product:
      type: object
      required: [id, slot, category, name, price]
      properties:
        id: { type: string, example: wheels-forged-turbine }
        slot: { $ref: '#/components/schemas/Slot' }
        category: { type: string, example: wheels }
        name: { type: string, example: Forged Turbine 7-Spoke 21" }
        description: { type: string }
        price: { type: integer, example: 98000 }
        component: { type: string }
        impl:
          type: object
          description: How the 3D viewer realises the product (wheels, attach, material, interior, preview).
          additionalProperties: true
        thumb:
          type: object
          properties:
            kind: { type: string }
            design: { type: string }
        finishes: { type: array, items: { $ref: '#/components/schemas/Finish' } }
        defaultFinish: { type: string }
        support: { $ref: '#/components/schemas/Support' }
        status: { $ref: '#/components/schemas/PublishStatus' }

    ProductWrite:
      type: object
      properties:
        id: { type: string, pattern: '^[a-z0-9-]+$' }
        slot: { $ref: '#/components/schemas/Slot' }
        category: { type: string }
        name: { type: string }
        description: { type: string }
        price: { type: integer, minimum: 0 }
        component: { type: string }
        impl: { type: object, additionalProperties: true }
        thumb: { type: object, additionalProperties: true }
        defaultFinish: { type: string }
        status: { $ref: '#/components/schemas/PublishStatus' }

    Paint:
      type: object
      required: [id, name, color, price]
      properties:
        id: { type: string, example: racing-red }
        name: { type: string, example: Racing Red }
        color: { type: string, example: '#a3070f' }
        metalness: { type: number }
        roughness: { type: number }
        clearcoat: { type: number }
        clearcoatRoughness: { type: number }
        price: { type: integer, example: 95000 }

    PaintChoice:
      type: object
      required: [id]
      properties:
        id: { type: string, example: custom }
        color: { type: string, description: Hex, only for id=custom, example: '#31506e' }
        finish: { type: string, enum: [gloss, metallic, satin, matte] }

    Selections:
      type: object
      description: Map of slot → chosen product
      additionalProperties:
        type: object
        required: [productId]
        properties:
          productId: { type: string }
          finishId: { type: string }
      example:
        wheels: { productId: wheels-forged-turbine, finishId: polished }

    Configuration:
      type: object
      required: [vehicleId, paint, selections]
      properties:
        vehicleId: { type: string, example: volvo-s90 }
        generation: { type: string, example: SPA }
        year: { type: integer, example: 2022 }
        paint: { $ref: '#/components/schemas/PaintChoice' }
        selections: { $ref: '#/components/schemas/Selections' }

    LineItem:
      type: object
      required: [slot, name, price]
      properties:
        slot: { type: string, description: A Slot, or `paint` }
        productId: { type: string }
        name: { type: string }
        finish: { type: string }
        price: { type: integer }

    Quote:
      type: object
      required: [currency, lineItems, total, priceVersion]
      properties:
        currency: { type: string, enum: [INR] }
        lineItems: { type: array, items: { $ref: '#/components/schemas/LineItem' } }
        total: { type: integer, example: 270000 }
        warnings:
          type: array
          items:
            type: object
            properties:
              slot: { type: string }
              code: { type: string, enum: [preview_only, discontinued] }
              message: { type: string }
        priceVersion: { type: integer }

    Build:
      type: object
      required: [id, shareCode, shareUrl, configuration, quote, createdAt]
      properties:
        id: { type: string, format: uuid }
        shareCode: { type: string, example: 7KQ2XM }
        shareUrl: { type: string, format: uri, example: https://modified.example/b/7KQ2XM }
        configuration: { $ref: '#/components/schemas/Configuration' }
        quote: { $ref: '#/components/schemas/Quote' }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    EnquiryCreate:
      type: object
      required: [name, consentMarketing, source]
      properties:
        name: { type: string, minLength: 2, maxLength: 80 }
        email: { type: string, format: email }
        phone: { type: string, description: E.164, example: '+919812345678' }
        city: { type: string, maxLength: 80 }
        preferredContact: { type: string, enum: [phone, email, whatsapp] }
        message: { type: string, maxLength: 2000 }
        buildShareCode: { type: string }
        build: { $ref: '#/components/schemas/Configuration' }
        consentMarketing: { type: boolean }
        source: { type: string, enum: [configurator, identify, visualize] }
        utm:
          type: object
          additionalProperties: { type: string }
        website: { type: string, maxLength: 0, description: Honeypot; must be empty }
      anyOf:
        - required: [email]
        - required: [phone]

    Enquiry:
      type: object
      properties:
        id: { type: string, format: uuid }
        reference: { type: string, example: ENQ-2026-000123 }
        status: { $ref: '#/components/schemas/EnquiryStatus' }
        name: { type: string }
        email: { type: string }
        phone: { type: string }
        city: { type: string }
        preferredContact: { type: string }
        message: { type: string }
        buildSnapshot:
          type: object
          properties:
            configuration: { $ref: '#/components/schemas/Configuration' }
            quote: { $ref: '#/components/schemas/Quote' }
        source: { type: string }
        assignedTo: { type: [string, 'null'], format: uuid }
        notes:
          type: array
          items:
            type: object
            properties:
              author: { type: string }
              body: { type: string }
              createdAt: { type: string, format: date-time }
        createdAt: { type: string, format: date-time }

    IdentifyResult:
      type: object
      required: [isCar, detected, match, confidence]
      properties:
        isCar: { type: boolean }
        detected:
          type: object
          properties:
            make: { type: string, example: Porsche }
            model: { type: string, example: '911' }
            variant: { type: string, example: Carrera 4S }
            generation: { type: string, example: '991' }
            yearEstimate: { type: [integer, 'null'], example: 2015 }
        match:
          type: [object, 'null']
          properties:
            vehicleId: { type: string }
            generation: { type: string }
            year: { type: [integer, 'null'] }
        unsupportedReason: { type: [string, 'null'] }
        confidence: { type: string, enum: [high, medium, low] }
        paint:
          type: object
          properties:
            name: { type: string }
            hex: { type: string }
            finish: { type: string, enum: [gloss, metallic, satin, matte] }
        wheels: { type: string }
        existingMods: { type: array, items: { type: string } }
        photoAdvice: { type: [string, 'null'] }
        photoProblems:
          type: array
          items:
            type: object
            properties:
              photo: { type: integer, description: 1-based }
              problem:
                type: string
                enum: [not_a_car, interior_only, too_blurry, too_dark, too_bright, too_far, cropped, obstructed, other_car]

    AiJob:
      type: object
      required: [jobId, kind, status]
      properties:
        jobId: { type: string, format: uuid }
        kind: { type: string, enum: [identify, visualize] }
        status: { type: string, enum: [queued, running, succeeded, failed] }
        resultUrl: { type: [string, 'null'], format: uri, description: Generated image, kept 24 h }
        error: { $ref: '#/components/schemas/Error' }
        createdAt: { type: string, format: date-time }
        finishedAt: { type: [string, 'null'], format: date-time }

    TokenPair:
      type: object
      required: [accessToken, refreshToken, expiresIn]
      properties:
        accessToken: { type: string }
        refreshToken: { type: string }
        expiresIn: { type: integer, example: 900, description: Seconds }

    AdminUser:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        name: { type: string }
        role: { type: string, enum: [admin, staff] }
```
