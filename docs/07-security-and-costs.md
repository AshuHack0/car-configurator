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
