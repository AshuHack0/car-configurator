# 4. API reference

REST API for the MODIFIED backend (proposed, version 1). The machine-readable contract is
[openapi.yaml](openapi.yaml); this page explains it for people.

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
