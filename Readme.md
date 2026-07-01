# VendHub — Marketplace Payment Infrastructure on Nomba

VendHub is a multi-vendor marketplace platform that gives every vendor an isolated virtual account for receiving payments, a hosted checkout flow for customers, automated settlement via bank transfer, and a reconciliation pipeline — all built on the Nomba API.

Built for the **DevCareer x Nomba Hackathon** — Marketplace / Multi-vendor track.

---

## Live URLs

| | URL |
|---|---|
| 🌐 API Base | `https://nomba-fintech.onrender.com/api/v1` |
| 📖 Swagger Docs | `https://nomba-fintech.onrender.com/api/docs` |
| 🖥️ Frontend | `https://vendhub-frontend-one.vercel.app` |
| ❤️ Health Check | `https://nomba-fintech.onrender.com/api/v1/health` |
| 📡 Webhook Endpoint | `https://nomba-fintech.onrender.com/-----/------` |
| 💻 GitHub Repo | `https://github.com/ezekiel780/Nomba-Fintech` |

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (TypeScript) |
| Database | PostgreSQL via Supabase, Prisma ORM |
| Cache / Idempotency | Redis (Memurai locally, Upstash in production) |
| Email | Resend (OTP + transactional notifications) |
| Auth | JWT access + refresh tokens, OTP-verified email |
| API Docs | Swagger at `/api/docs` |
| Payments | Nomba API (Checkout, Virtual Accounts, Transfers, Webhooks, Transactions) |
| Frontend | React + Vite + Tailwind CSS, deployed on Vercel |
| Backend Hosting | Render |

---

## Project Structure

```
vendhub-backend/
├── prisma/
│   ├── migrations/             # All database migrations (versioned)
│   │   ├── 20260626131321_init/
│   │   ├── 20260626_add_refresh_token/
│   │   └── 20260626_add_checkout_sessions/
│   ├── schema.prisma           # Prisma schema (models + datasource)
│   └── prisma.config.ts        # Prisma 7 config (datasource URL for migrations)
│
├── src/
│   ├── auth/                   # Authentication module
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   └── login.dto.ts
│   │   ├── auth.controller.ts  # register, verify-otp, login, refresh, logout, forgot/reset
│   │   ├── auth.service.ts     # Business logic, rate limiting, token signing
│   │   ├── auth.module.ts
│   │   ├── jwt.strategy.ts     # Passport JWT strategy (rejects refresh tokens)
│   │   └── jwt-auth.guard.ts   # JWT guard for protected routes
│   │
│   ├── vendors/                # Vendor management module
│   │   ├── dto/
│   │   │   ├── create-vendor.dto.ts
│   │   │   └── settle-vendor.dto.ts
│   │   ├── vendors.controller.ts  # create, list, balance, settle
│   │   ├── vendors.service.ts     # Bank lookup → virtual account → DB
│   │   └── vendors.module.ts
│   │
│   ├── checkout/               # Checkout module
│   │   ├── dto/
│   │   │   └── create-checkout.dto.ts
│   │   ├── checkout.controller.ts  # initiate, status, callback
│   │   ├── checkout.service.ts     # Nomba checkout order + session tracking
│   │   └── checkout.module.ts
│   │
│   ├── webhooks/               # Webhook receiver module
│   │   ├── webhooks.controller.ts  # POST /webhooks/nomba
│   │   ├── webhooks.service.ts     # HMAC verify → idempotency → event routing
│   │   └── webhooks.module.ts
│   │
│   ├── transactions/           # Transactions + reconciliation module
│   │   ├── dto/
│   │   │   └── query-transaction.dto.ts
│   │   ├── transactions.controller.ts  # list, get one, reconcile, bank-codes
│   │   ├── transactions.service.ts     # Nomba API + reconciliation diff logic
│   │   └── transactions.module.ts
│   │
│   ├── nomba/                  # Nomba API client (global singleton)
│   │   ├── nomba.service.ts    # All Nomba API calls, token caching, error logging
│   │   └── nomba.module.ts
│   │
│   ├── prisma/                 # Prisma client wrapper (global singleton)
│   │   ├── prisma.service.ts   # PrismaClient with adapter-pg for Prisma 7
│   │   └── prisma.module.ts
│   │
│   ├── redis/                  # Redis client wrapper (global singleton)
│   │   ├── redis.service.ts    # OTP storage, token caching, webhook deduplication
│   │   └── redis.module.ts
│   │
│   ├── otp/                    # OTP generation + email delivery
│   │   ├── otp.service.ts      # Generate, rate-limit, send via Resend, verify
│   │   └── otp.module.ts
│   │
│   ├── health/                 # Health check module
│   │   ├── health.controller.ts  # GET /health — DB + Redis status
│   │   └── health.module.ts
│   │
│   ├── app.module.ts           # Root module — imports all feature modules
│   └── main.ts                 # Bootstrap — rawBody, Swagger, global prefix
│
├── .env.example                # Environment variable template
├── .gitignore                  # Excludes .env, dist/, node_modules/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Architecture

```
Customer → Checkout (hosted Nomba page) → Webhook (payment_success)
                                                ↓
                                      VendHub verifies HMAC signature
                                      checks idempotency (requestId)
                                      marks CheckoutSession as paid
                                      credits Transaction to vendor ledger
                                                ↓
                                Admin settles vendor → Nomba Transfer API
                                    (bank lookup → verified transfer)
                                                ↓
                                      Reconciliation job
                                compares Nomba records vs local ledger
                                flags orphans and amount drift
```

---

## Database Schema

### Entity Relationship Diagram

```
users (1) ──────────< vendors (many)
users (1) ──────────< payouts (many)
users (1) ──────────< otps (many)

vendors (1) ─────────< transactions (many)
vendors (1) ─────────< payouts (many)
vendors (1) ─────────< checkout_sessions (many)

webhook_events  ── standalone audit log (keyed by requestId)
```

### SQL Schema (Generated by Prisma Migrations)

```sql
-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password       TEXT NOT NULL,                    -- bcrypt hashed
  "isVerified"   BOOLEAN NOT NULL DEFAULT FALSE,
  "refreshToken" TEXT,                             -- bcrypt hashed, nullable
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL
);

-- ─── Vendors ─────────────────────────────────────────────────────────────────
CREATE TABLE vendors (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  "bankCode"            TEXT NOT NULL,
  "accountNumber"       TEXT NOT NULL,
  "resolvedAccountName" TEXT NOT NULL,             -- verified via Nomba bank lookup
  "accountRef"          TEXT NOT NULL UNIQUE,      -- stable external ref for Nomba API
  "subAccountId"        TEXT,                      -- Nomba sub-account (dashboard-provisioned)
  "virtualAccountNo"    TEXT,                      -- Nomba NUBAN for this vendor
  "virtualBankName"     TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  "userId"              TEXT NOT NULL REFERENCES users(id)
);

-- ─── Checkout Sessions ────────────────────────────────────────────────────────
CREATE TABLE checkout_sessions (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderReference" TEXT NOT NULL UNIQUE,           -- Nomba order reference (UUID)
  amount           INTEGER NOT NULL,               -- in kobo (NGN × 100)
  currency         TEXT NOT NULL DEFAULT 'NGN',
  status           TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  "checkoutLink"   TEXT,                           -- Nomba hosted payment URL
  "customerEmail"  TEXT NOT NULL,
  "customerId"     TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "vendorId"       TEXT NOT NULL REFERENCES vendors(id)
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "merchantTxRef" TEXT NOT NULL UNIQUE,            -- idempotency key for all calls
  amount          INTEGER NOT NULL,                -- in kobo
  "amountExpected" INTEGER,
  currency        TEXT NOT NULL DEFAULT 'NGN',
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
  type            TEXT NOT NULL,                   -- payment_success | virtual_account.funded
  narration       TEXT,
  "customerEmail" TEXT,
  "customerId"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "vendorId"      TEXT REFERENCES vendors(id)
);

-- ─── Payouts ─────────────────────────────────────────────────────────────────
CREATE TABLE payouts (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "merchantTxRef" TEXT NOT NULL UNIQUE,            -- idempotency key for transfers
  amount          INTEGER NOT NULL,                -- in kobo
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
  narration       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "vendorId"      TEXT NOT NULL REFERENCES vendors(id),
  "userId"        TEXT NOT NULL REFERENCES users(id)
);

-- ─── Webhook Events (Idempotency Audit Log) ───────────────────────────────────
CREATE TABLE webhook_events (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestId"   TEXT NOT NULL UNIQUE,              -- Nomba requestId — deduplication key
  "eventType"   TEXT NOT NULL,
  payload       JSONB NOT NULL,                    -- full raw webhook payload
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── OTPs ────────────────────────────────────────────────────────────────────
CREATE TABLE otps (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,
  type        TEXT NOT NULL,                       -- register | reset_password
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId"    TEXT NOT NULL REFERENCES users(id)
);
```

### Normalization

The schema is in **Third Normal Form (3NF)**:

**1NF** — every column holds a single atomic value. No arrays or JSON blobs store repeating groups — a vendor's transactions live in their own table, not as a JSON array on the vendor row.

**2NF** — every non-key column depends on the whole primary key. All tables use a single-column UUID primary key, so partial dependency cannot occur.

**3NF** — no transitive dependencies. Non-key columns depend only on the primary key, not on other non-key columns. The vendor's admin email is never duplicated onto the vendor row — it is joined at query time via the `userId` foreign key.

**Why not a star schema:** star and snowflake schemas are OLAP (analytical) patterns optimized for aggregate queries over large historical datasets. VendHub is an OLTP system — every write must be immediately consistent (a vendor's balance must reflect a payment the instant it's recorded). A normalized 3NF schema is the correct fit. A star schema would be appropriate for a separate analytics/reporting data warehouse fed by ETL from this OLTP database — a reasonable future evolution.

---

## Normalization (1NF–6NF)

| Normal Form | Status | Notes |
|---|---|---|
| 1NF | ✅ | All columns atomic, no repeating groups |
| 2NF | ✅ | Single-column PKs everywhere, no partial dependencies |
| 3NF | ✅ | No transitive dependencies, no redundant data |
| BCNF | ✅ | Every determinant is a candidate key |
| 4NF | ✅ | No multi-valued dependencies |
| 5NF | ✅ | No join dependencies beyond those implied by candidate keys |
| 6NF | N/A | 6NF applies to temporal databases; VendHub uses `createdAt`/`updatedAt` timestamps, not bitemporal modeling |

---

## Data Integration

**Outbound (VendHub → Nomba):** REST API calls authenticated via a cached OAuth2 client-credentials token (refreshed automatically at the 55-minute mark). Every failed call logs the full Nomba error response for precise debugging.

**Inbound (Nomba → VendHub):** Asynchronous webhook events delivered to `/api/v1/webhooks/nomba`. Each event is:

1. Verified via HMAC-SHA256 field-concatenation signature (per Nomba's documented algorithm)
2. Checked for duplicates via `requestId` (Redis + `webhook_events` table)
3. Routed to the correct handler (`CheckoutSession`, `Transaction`, or `Payout`)
4. Acknowledged with `200 OK` immediately — processing is async so Nomba never times out

---

## API Overview

| Module | Endpoints | Auth |
|---|---|---|
| Auth | register, verify-otp, login, refresh, logout, forgot-password, reset-password | Public (except logout) |
| Vendors | create, list, balance, settle | JWT |
| Checkout | initiate, status, callback | Public (customer-facing) |
| Webhooks | Nomba event receiver | HMAC signature |
| Transactions | list, get one, reconcile, bank-codes | JWT |
| Health | status check | Public |

Full interactive docs with Try it out at `/api/docs`.

---

## Auth Flow

```
POST /auth/register        → creates user, sends OTP via Resend
POST /auth/verify-otp      → confirms email, no token issued
POST /auth/login           → returns accessToken (15 min) + refreshToken (30 days)
POST /auth/refresh         → exchanges refreshToken for new token pair
POST /auth/logout          → revokes stored refresh token (JWT required)
POST /auth/forgot-password → sends password reset OTP
POST /auth/reset-password  → resets password using OTP
```

## Vendor Flow

```
POST /vendors              → bank lookup → virtual account creation → saved to DB
GET  /vendors              → list vendors for logged-in admin
GET  /vendors/:ref/balance → sums successful transactions for that vendor
POST /vendors/:ref/settle  → bank lookup → Nomba transfer → payout record created
```

## Checkout Flow

```
POST /checkout/initiate         → creates Nomba hosted checkout order for a vendor
GET  /checkout/:orderReference  → checks local + live order status
GET  /checkout/callback         → customer return URL (does NOT mark paid)
```

Orders are only marked paid via a verified `payment_success` webhook — never from the callback redirect alone.

---

## Security

- Refresh tokens stored hashed (bcrypt), never in plaintext
- Access tokens (15 min) and refresh tokens (30 days) signed separately — a stolen refresh token cannot authenticate against protected routes (enforced in `JwtStrategy.validate()`)
- Login rate-limited (5 attempts per 15 minutes per email) via Redis
- All webhooks verified via HMAC-SHA256 field-concatenation before any payload is parsed
- Webhook events deduplicated by `requestId` (Redis + DB) to prevent double-crediting on Nomba retries
- Every transfer resolves and confirms recipient name via `/transfers/bank/lookup` before sending
- CORS restricted to known frontend origins via `ALLOWED_ORIGINS`
- Secrets loaded from environment variables only — never committed to source

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Generate strong secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Run database migrations
npx prisma migrate dev
npx prisma generate

# 5. Start dev server
npm run start:dev

# 6. Open Swagger docs
open http://localhost:3000/api/docs
```

---

## Environment Variables

| Group | Variables |
|---|---|
| App | `PORT`, `NODE_ENV` |
| Nomba API | `NOMBA_CLIENT_ID`, `NOMBA_PRIVATE_KEY`, `NOMBA_ACCOUNT_ID`, `NOMBA_SUB_ACCOUNT_ID`, `NOMBA_BASE_URL`, `NOMBA_WEBHOOK_SECRET` |
| Database | `DATABASE_URL` |
| Redis | `REDIS_URL` |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Checkout | `CHECKOUT_CALLBACK_URL` |

---

## Known Limitations

**Nomba's Sub-Account creation API is deprecated.** VendHub does not call it. Sub-account provisioning happens via the Nomba dashboard; VendHub uses the sub-account ID issued at hackathon onboarding and tracks per-vendor balances in its own Postgres ledger.

**Sandbox virtual account limit.** Nomba sandbox previously enforced a hard limit of 2 virtual accounts per account holder — this limit has since been raised by the Nomba team for hackathon participants. Vendor creation and virtual account provisioning are fully functional in the sandbox environment.

**Settlement requires a funded Nomba wallet.** A settlement attempted before any inbound payment has been received correctly fails with `INSUFFICIENT_BALANCE`, surfaced as a clear error message.

---

## What's Next

- Real end-to-end webhook delivery confirmation from a live customer payment
- Tokenized card recurring charges (not required for this track)
- CI/CD via GitHub Actions
- Switch credentials to live values post-KYB — environment variables only, no code changes required
