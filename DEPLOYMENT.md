# FlipRepublic deployment guide

Production site: [https://fliprepublic.com](https://fliprepublic.com)

## Prerequisites

- Node.js 20+
- Supabase project (URL, anon key, service role key)
- Stripe account (secret key, webhook secret, publishable key)
- Gmail SMTP or transactional provider (app password for Gmail)

## Environment variables

Set these in Vercel (or your host) — **never commit** `.env.local`.

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; never expose to client |
| `STRIPE_SECRET_KEY` | Yes | Unless `USE_FREE_PAYMENT=true` (dev only) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe → `/api/webhooks/stripe` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Checkout |
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://fliprepublic.com` |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as site URL |
| `EMAIL_USER` / `EMAIL_PASS` | Yes | Or `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` |
| `ADMIN_EMAIL` | Recommended | Dispute & listing alerts |
| `ESCROW_HOLD_DAYS` | Optional | Default `7`; `0` disables hold |
| `EMPIRE_OS_ENABLED` | Optional | Set `false` to disable Empire OS |
| `CRON_SECRET` | Yes (prod) | Secures `/api/cron/*` routes |
| `CRON_SECRET` | | Header: `Authorization: Bearer <secret>` or `x-cron-secret` |

## Database migrations

Apply all files in `supabase/migrations/` in order on your Supabase SQL editor or CLI:

```bash
supabase db push
```

Latest includes Empire OS tables, metrics, and escrow indexes.

## Stripe webhook

1. Stripe Dashboard → Developers → Webhooks  
2. Endpoint: `https://fliprepublic.com/api/webhooks/stripe`  
3. Events: `checkout.session.completed` (and any others you already use)  
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## Scheduled jobs (Vercel Cron)

Add to `vercel.json` (or host cron):

```json
{
  "crons": [
    { "path": "/api/cron/empire-os", "schedule": "0 8 * * *" },
    { "path": "/api/cron/escrow-release", "schedule": "0 */6 * * *" }
  ]
}
```

Call with header `Authorization: Bearer <CRON_SECRET>`.

## Build & deploy

```bash
npm install
npm run build
npm run start
```

On Vercel: connect GitHub repo `KhamareClarke/FlipRepublic.com`, set env vars, deploy `main`.

## Post-deploy checks

1. Sign up / login (buyer and seller flows)  
2. Create listing → admin approval → active  
3. Checkout test mode purchase  
4. Admin → Platform analytics → Empire OS events  
5. Test email: `node scripts/send-test-email.mjs you@example.com` (local with `.env.local`)

## Tests

```bash
npm run test
```

Runs Vitest unit tests for escrow, coupons, and Empire OS registry.
