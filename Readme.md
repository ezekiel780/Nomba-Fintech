# VendHub — Marketplace Payment Infrastructure on Nomba

VendHub is a multi-vendor marketplace backend that gives every vendor an isolated
virtual account for receiving payments, a hosted checkout flow for customers,
automated settlement via bank transfer, and a reconciliation pipeline — all built
on the Nomba API.

Built for the DevCareer x Nomba Hackathon — Marketplace / Multi-vendor track.

## Stack

- **Backend:** NestJS (TypeScript)
- **Database:** PostgreSQL via Supabase, accessed with Prisma ORM
- **Cache / Idempotency store:** Redis (Memurai locally, Upstash in production)
- **Email (transactional notifications):** Resend
- **Auth:** JWT access + refresh tokens, OTP-verified email registration
- **API docs:** Swagger at `/api/docs`
- **Payments:** Nomba API (Checkout, Virtual Accounts, Transfers, Webhooks, Transactions)
- **Frontend:** React + Vite + Tailwind, deployed on Vercel
- **Backend hosting:** Render

## Live URLs

- API base: `https://nomba-fintech.onrender.com/api/v1`
- Swagger docs: `https://nomba-fintech.onrender.com/api/docs`
- Frontend: `https://vendhub-frontend-one.vercel.app`
- Webhook endpoint: `https://nomba-fintech.onrender.com/api/v1/webhooks/nomba`

## Architecture

```
Customer → Checkout (hosted Nomba page) → Webhook (payment_success)
                                              ↓
                                    VendHub marks order paid,
                                    credits vendor's ledger balance
                                              ↓
                              Admin settles vendor → Nomba Transfer API
                                              ↓
                                    Reconciliation job
                              compares Nomba's records vs local ledger
```

Vendor balances are tracked in VendHub's own Postgres ledger (summed from
successful `Transaction` records), not from Nomba's deprecated sub-account
balance API — see "Known Limitations" for why.

## Database Schema (Entity-Relationship Model)

VendHub uses a normalized relational schema, modeled as the following entities
and relationships:

```
User (1) ──────< (many) Vendor
User (1) ──────< (many) Payout
User (1) ──────< (many) Otp

Vendor (1) ─────< (many) Transaction
Vendor (1) ─────< (many) Payout
Vendor (1) ─────< (many) CheckoutSession

WebhookEvent — standalone audit log, referenced by requestId for idempotency
```

### Entities

**User** — the marketplace admin account. Holds login credentials (hashed
password), email verification state, and a hashed refresh token for session
management. One user can own many vendors.

**Vendor** — a seller onboarded into the marketplace. Stores the resolved bank
account details (from Nomba's bank lookup), the Nomba virtual account assigned
to them, and a unique `accountRef` used as the stable external reference
across all Nomba API calls. Belongs to exactly one User (the admin who
onboarded them).

**Transaction** — an immutable record of a single money movement tied to a
vendor: either a virtual account being funded by a customer, or a checkout
payment succeeding. This table is the source of truth for vendor balances —
balance is computed as `SUM(amount) WHERE status = 'success'`, not stored as a
mutable counter, to avoid drift between the ledger and reality.

**CheckoutSession** — a hosted Nomba checkout order created for a specific
vendor and amount. Tracks `pending` → `paid` status, updated only by a
verified webhook, never by the customer-facing callback redirect alone.

**Payout** — a record of an outbound settlement (vendor payout) initiated via
Nomba's Transfer API. Tracks `pending` → `success` / `failed` status, updated
by the `transfer.success` / `transfer.failed` webhook events.

**WebhookEvent** — an audit log of every webhook received from Nomba, keyed by
Nomba's own `requestId`. This table is the mechanism behind idempotency: a
duplicate webhook delivery (which Nomba's own documentation confirms can
happen on retry) is detected and ignored before it can double-process a
payment or settlement.

**Otp** — short-lived verification codes for registration and password reset,
tied to a User.

## Normalization

The schema is in **Third Normal Form (3NF)**:

- **1NF** — every column holds a single atomic value; no repeating groups or
  arrays stored in a single field (e.g. a vendor's transactions live in their
  own table, not as a JSON array on the vendor row).
- **2NF** — every non-key column depends on the whole primary key. Since every
  table uses a single-column UUID primary key, partial dependency (a 2NF
  violation, which only applies to composite keys) cannot occur.
- **3NF** — no transitive dependencies: non-key columns depend only on the
  primary key, not on other non-key columns. For example, `Vendor.userId`
  references the owning admin directly; the admin's email is never duplicated
  onto the Vendor row, even though it's frequently needed together (it's
  joined at query time instead).

**Why not a star or snowflake schema:** star and snowflake schemas are
dimensional modeling patterns designed for OLAP (analytical/reporting)
workloads — wide fact tables surrounded by denormalized dimension tables,
optimized for aggregate queries across large historical datasets. VendHub is
an OLTP (transactional) system: every write needs to be immediately
consistent (a vendor's balance must reflect a settlement the instant it's
recorded), and the data volume per entity is modest. Applying a star schema
here would mean deliberately denormalizing data that needs strict consistency
guarantees, in exchange for query performance benefits VendHub doesn't need
at this scale. A normalized 3NF relational schema is the correct fit for this
workload; a star schema would be the correct choice if VendHub later needed a
separate analytics/reporting data warehouse fed by ETL from this OLTP
database — which is a reasonable future evolution, not a current requirement.

## Data Integration

VendHub integrates with Nomba through two distinct data flows:

**Outbound (VendHub → Nomba):** REST API calls for bank account lookup,
virtual account creation, checkout order creation, and bank transfers. Every
outbound call is authenticated via a cached OAuth2 client-credentials token
(refreshed automatically before expiry) and logged with full request/response
detail on failure, so upstream Nomba errors are surfaced precisely rather than
swallowed into generic failures.

**Inbound (Nomba → VendHub):** asynchronous webhook events
(`payment_success`, `virtual_account.funded`, `transfer.success`,
`transfer.failed`) delivered to a single endpoint. Each event is:

1. Verified via HMAC-SHA256 signature before any processing occurs
2. Checked against `WebhookEvent.requestId` for idempotency (Redis + database)
3. Routed to a handler that updates the relevant `CheckoutSession`,
   `Transaction`, or `Payout` record
4. Acknowledged with `200 OK` immediately, with processing happening
   asynchronously after the response is sent — so a slow downstream operation
   never causes Nomba to time out and retry unnecessarily

This pattern (signature verification → idempotency check → async processing →
immediate ack) follows Nomba's own documented best practices for webhook
consumers.

## Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
   Generate strong secrets with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Run database migrations:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Start the server:
   ```bash
   npm run start:dev
   ```

5. Open Swagger docs: `http://localhost:3000/api/docs`

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
| CORS | `ALLOWED_ORIGINS` (comma-separated; falls back to open CORS with a warning if unset) |

Secrets are loaded from environment variables only — never committed to
source. `.env` is gitignored.

## API Overview

| Module | Endpoints | Auth required |
|---|---|---|
| Auth | register, verify-otp, login, refresh, logout, forgot/reset password | No (except logout) |
| Vendors | create, list, balance, settle | Yes (JWT) |
| Checkout | initiate, status, callback | No (customer-facing) |
| Webhooks | Nomba event receiver | HMAC signature, not JWT |
| Transactions | list, get one, reconcile, bank-codes | Yes (JWT) |
| Health | service status check | No |

Full interactive documentation with request/response schemas is in Swagger.

## Security Notes

- Refresh tokens stored hashed (bcrypt), never in plaintext
- Access tokens (15 min) and refresh tokens (30 days) signed separately; a
  stolen refresh token cannot authenticate against protected routes
- Login rate-limited (5 attempts per 15 minutes per email) via Redis
- All webhooks verified via HMAC-SHA256 before any payload is parsed
- Webhook events deduplicated by `requestId` to prevent double-crediting
- Every transfer resolves and confirms the recipient's name before sending,
  per Nomba's documented safety guidance
- CORS restricted to known frontend origins via `ALLOWED_ORIGINS`
- All amounts stored as `BigInt` in the database to prevent integer overflow
  at scale, with explicit conversion at every API response boundary

## Known Limitations

**Nomba's Sub-Account creation API is deprecated.** VendHub does not call it.
Sub-account provisioning happens via the Nomba dashboard; VendHub uses the
sub-account ID issued at onboarding and tracks per-vendor balances in its own
ledger instead.

**Settlement requires a funded Nomba wallet balance.** Wallet funding occurs
automatically when a customer completes a real payment through Checkout or a
Virtual Account — there is no separate manual top-up endpoint. A settlement
attempted before any inbound payment has been received will correctly fail
with `INSUFFICIENT_BALANCE`, which VendHub surfaces as a clear error message
rather than a generic failure.

## What's Next

- Real end-to-end webhook delivery confirmation from a live customer payment
- Tokenized card recurring charges (not required for this track)
- CI/CD via GitHub Actions
- Switch credentials to live values post-KYB — environment variables only,
  no code changes required
  