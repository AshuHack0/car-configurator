# MODIFIED — Project Documentation

MODIFIED is a web car configurator: a customer picks a car, customises it in live 3D (paint, wheels,
body kit, interior), sees an estimated price, and sends an enquiry. The **frontend is built and working**;
the **backend is designed here and not built yet**.

Status as of 26 Nov 2026.

## Read in this order

| # | Document | What it answers | Main reader |
|---|---|---|---|
| 1 | [Product overview](01-product-overview.md) | What the product does today, who it is for, what is in and out of scope | Everyone |
| 2 | [Architecture](02-architecture.md) | How the system fits together now and after the backend; chosen tech stack and why | Lead, developers |
| 3 | [Data model](03-data-model.md) | The database tables and how they relate | Developers |
| 4 | [API reference](04-api-reference.md) | Every endpoint, request and response, errors, limits | Developers, designer (for states) |
| 5 | [OpenAPI spec](openapi.yaml) | The same API as a machine-readable contract (import into Postman, Swagger UI, code generators) | Developers |
| 6 | [Backend setup](05-backend-setup.md) | Repository layout, local setup, environment variables, conventions, CI/CD, deployment | Developers |
| 7 | [3D asset pipeline](06-3d-asset-pipeline.md) | How a car goes from a Blender/GLB file to the website, with size budgets | Lead, developers, 3D artist |
| 8 | [Security, privacy and costs](07-security-and-costs.md) | Auth, rate limits, customer data, AI spending, model licences | Lead, manager |
| 9 | [Roadmap](08-roadmap.md) | Phases, milestones, estimates and who does what | Manager, everyone |

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
