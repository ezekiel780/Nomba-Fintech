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
- **Email (OTP delivery):** Resend
- **Auth:** JWT access + refresh tokens, OTP-verified email registration
- **API docs:** Swagger at `/api/docs`
- **Payments:** Nomba API (Checkout, Virtual Accounts, Transfers, Webhooks, Transactions)

## Architecture

```
Customer → Checkout (hosted Nomba page) → Webhook (payment_success)
                                              ↓
                                    VendHub marks order paid,
                                    credits vendor's ledger balance
                                              ↓
                              Admin settles vendor → Nomba Transfer API
                                              ↓
                                    Nightly reconciliation job
                              compares Nomba's records vs local ledger
```

Vendor balances are tracked in VendHub's own Postgres ledger (summed from
successful `Transaction` records), not from Nomba's sub-account balance API —
see "Known Limitations" below for why.

## Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your Nomba **sandbox** credentials, Supabase connection string,
   Redis URL, JWT secret, and Resend API key. Generate strong secrets with:
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

5. Open Swagger docs:
   ```
   http://localhost:3000/api/docs
   ```

6. Expose your webhook endpoint for local testing (ngrok or similar):
   ```bash
   ngrok http 3000
   ```
   Submit `https://<your-ngrok-url>/api/v1/webhooks/nomba` as your webhook URL
   on the Nomba dashboard.

## Environment Variables

See `.env.example` for the full list. Key groups:

| Group | Variables |
|---|---|
| App | `PORT`, `NODE_ENV` |
| Nomba API | `NOMBA_CLIENT_ID`, `NOMBA_PRIVATE_KEY`, `NOMBA_ACCOUNT_ID`, `NOMBA_SUB_ACCOUNT_ID`, `NOMBA_BASE_URL`, `NOMBA_WEBHOOK_SECRET` |
| Database | `DATABASE_URL` |
| Redis | `REDIS_URL` |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Checkout | `CHECKOUT_CALLBACK_URL` |

Never commit `.env` to source control. Secrets are loaded from environment
variables only, and in production should come from a secret manager (e.g.
Render's environment variable dashboard), not a committed file.

## API Overview

| Module | Endpoints | Auth required |
|---|---|---|
| Auth | register, verify-otp, login, refresh, logout, forgot/reset password | No (except logout) |
| Vendors | create, list, balance, settle | Yes (JWT) |
| Checkout | initiate, status, callback | No (customer-facing) |
| Webhooks | Nomba event receiver | HMAC signature, not JWT |
| Transactions | list, get one, reconcile | Yes (JWT) |
| Health | service status check | No |

Full interactive documentation with request/response schemas is available in
Swagger at `/api/docs` once the server is running.

### Auth flow

```
POST /auth/register       → creates user, sends OTP via email
POST /auth/verify-otp     → confirms email, no token issued
POST /auth/login          → returns accessToken (15 min) + refreshToken (30 days)
POST /auth/refresh        → exchanges a valid refreshToken for a new token pair
POST /auth/logout         → revokes the stored refresh token (requires Bearer token)
POST /auth/forgot-password → sends a password reset OTP
POST /auth/reset-password  → resets password using the OTP
```

### Vendor flow

```
POST /vendors              → bank lookup → virtual account creation → saved to DB
GET  /vendors               → list vendors for the logged-in admin
GET  /vendors/:ref/balance  → sums successful transactions for that vendor
POST /vendors/:ref/settle   → bank lookup → Nomba transfer → payout record created
```

### Checkout flow

```
POST /checkout/initiate         → creates a Nomba hosted checkout order for a vendor
GET  /checkout/:orderReference  → checks local + live order status
GET  /checkout/callback         → customer return URL after payment (does not mark paid)
```

Orders are only marked `paid` via the verified `payment_success` webhook —
never from the callback redirect alone, since a callback can be hit without
a real completed payment.

## Security Notes

- Refresh tokens are stored hashed (bcrypt), never in plaintext
- Access tokens (15 min) and refresh tokens (30 days) are signed separately;
  a stolen refresh token cannot be used to authenticate against protected
  routes (enforced in `JwtStrategy`)
- Login attempts are rate-limited (5 per 15 minutes per email) via Redis
- All Nomba webhooks are verified via HMAC-SHA256 signature before any
  payload is parsed or acted on
- Webhook events are deduplicated by `requestId` (Redis + DB) to prevent
  double-crediting on Nomba's retry behavior
- Every transfer looks up and displays the resolved account name before
  sending money, per Nomba's recommended safety practice
- Secrets are loaded from environment variables only — never committed to
  source or hardcoded

## Known Limitations

**Nomba sandbox enforces a hard limit of 2 virtual accounts per account
holder, and virtual account expiration is not supported in sandbox.** Our
sandbox credentials hit that cap during development testing, with no way to
reset it from the API or dashboard. The vendor creation and checkout flows
are fully implemented and have been verified against Nomba's actual error
responses (bank lookup succeeds, requests reach Nomba correctly, and the
`400`/`500` responses returned are Nomba's own documented sandbox
constraints — not malformed requests on our side).

Full end-to-end live testing of vendor onboarding is blocked until either:

- The hackathon organizers raise the sandbox quota, or
- Fresh sandbox credentials are issued

This is a platform constraint, not a defect in the integration.

**Nomba's Sub-Account creation API is deprecated** (confirmed via Nomba's own
changelog: "This API is deprecated but remains functional for existing
users"). VendHub does not call it. Sub-account provisioning is expected to
happen via the Nomba dashboard; VendHub uses the sub-account ID issued at
hackathon onboarding and tracks per-vendor balances in its own Postgres
ledger instead.

## What's Next

- Tokenized card recurring charges (not required for this track)
- Mandates / Direct Debit (BNPL track, not applicable here)
- CI/CD via GitHub Actions
- Deployment to Render with Upstash Redis in production
- Switch `NOMBA_BASE_URL` and credentials to live values post-KYB approval —
  no code changes required, environment variables only
  