# naborhoa

HOA management app, **self-hosted on [Supabase](https://supabase.com)** (Postgres +
Auth + Edge Functions + Storage). This project was migrated off Base44; the app code
still talks to a `base44`-shaped SDK, but that shim is now backed entirely by Supabase,
so there is no Base44 account or subscription required.

- Frontend: React + Vite (`src/`)
- Backend: Supabase Postgres, Auth, Storage, and 37 Deno Edge Functions (`supabase/`)

## How the migration works (architecture)

The whole app depends on a small compatibility layer, so almost no feature code changed:

- **Frontend shim** — `src/api/base44Client.js` exposes the same surface the app already
  used (`base44.entities.*`, `base44.auth.*`, `base44.functions.invoke`,
  `base44.integrations.Core.*`) on top of `@supabase/supabase-js`
  (`src/api/supabaseClient.js`).
- **Edge shim** — `supabase/functions/_shared/base44-compat.ts` gives every ported
  function the same `createClientFromRequest(req)` API it used on Base44
  (`.auth.me()`, `.asServiceRole.entities.*`, `.integrations.Core.*`).
- **Schema is generated** from the original entity definitions in `base44/entities/*.jsonc`
  by `scripts/generate-schema.mjs`, which writes the SQL migrations, the RLS policies, and
  the entity→table maps used by both shims. Re-run it with `npm run gen:schema` if you
  change an entity. The `base44/` folder is kept only as the source of truth for codegen
  and data migration — nothing at runtime imports it.

```
base44/entities/*.jsonc ──gen:schema──► supabase/migrations/*.sql
                                        supabase/entity_map.json
                                        src/api/entityTables.js
                                        supabase/functions/_shared/entity-map.ts
```

## Prerequisites

1. [Node.js](https://nodejs.org) 20+ and `npm`.
2. The [Supabase CLI](https://supabase.com/docs/guides/cli): `npm install -g supabase`.
3. A free [Supabase Cloud](https://supabase.com/dashboard) project (or run
   `supabase start` locally with Docker).
4. Install dependencies: `npm install`.

## One-time Supabase setup

### 1. Link the project and push the database

```bash
supabase login
supabase link --project-ref <your-project-ref>   # from the dashboard URL
supabase db push                                  # applies supabase/migrations/*
```

This creates every table, the Row-Level Security policies, the `profiles` table wired to
`auth.users` (with an auto-create trigger on signup), the public `uploads` storage bucket,
and adds `notification` to the realtime publication.

### 2. Deploy the Edge Functions

```bash
supabase functions deploy
```

`supabase/config.toml` already marks the public/guest endpoints and external webhooks as
`verify_jwt = false`; everything else requires a signed-in user.

### 3. Set Edge Function secrets

Only set the ones you use. AI chat needs OpenAI; email needs Resend; payments need Stripe.

```bash
supabase secrets set \
  OPENAI_API_KEY=sk-...            \
  OPENAI_MODEL=gpt-4o-mini         \
  RESEND_API_KEY=re_...            \
  RESEND_FROM="Naborhoa <no-reply@yourdomain.com>" \
  Stripe_api_key=sk_live_...       \
  Stripe_webhook=whsec_...         \
  APP_BASE_URL=https://naborhoa.com
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into functions automatically —
do not set them yourself.

> Secret names (`Stripe_api_key`, `Stripe_webhook`) match what the ported function code reads
> via `Deno.env.get(...)`; keep them exactly as shown (note the capital `S` in the Stripe names).

Payments run entirely on Stripe — see **[Payments (Stripe)](#payments-stripe)** for the full
step-by-step (Stripe Connect for HOA dues plus the platform subscription and webhook).

### 4. Configure Auth

In **Dashboard → Authentication**:

- **URL Configuration**: set the Site URL and redirect URLs to your frontend origin
  (e.g. `http://localhost:5173` for dev and your production URL). Also update `site_url` /
  `additional_redirect_urls` in `supabase/config.toml`.
- **Providers → Email**: enable email + "Confirm email".
- **Providers → Google** (and Apple, if used): enable and paste OAuth credentials. The
  redirect URL is `https://<project-ref>.supabase.co/auth/v1/callback`.
- **Email Templates** — the login/reset pages expect these tokens:
  - **Confirm signup**: include the 6-digit code token `{{ .Token }}` (the Register/Login
    pages verify a 6-digit OTP).
  - **Reset password**: point the link at
    `{{ .SiteURL }}/reset-password?token={{ .TokenHash }}` (the ResetPassword page reads
    `?token=`).

### 5. Point the frontend at Supabase

Create `.env.local` in the project root (see `.env.example`):

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

## Run locally

```bash
npm run dev      # Vite dev server against your Supabase project
npm run build    # production build
```

## Payments (Stripe)

The app uses **one Stripe account** for two separate money flows, kept apart by how each
Checkout Session is built — Stripe itself routes the money, so they can never mix:

| Flow | Who pays whom | Stripe mechanism | Where the money lands |
| --- | --- | --- | --- |
| **HOA dues / invoices** | residents pay their HOA | Connect destination charge (`transfer_data` + 1.5% `application_fee`) | the HOA's connected account; you keep the 1.5% fee |
| **App subscription** | HOA admin pays you | direct charge, no Connect | your platform account (100%) |

Functions: `stripe-checkout` (one-time dues), `stripe-subscription-checkout` (dues auto-pay),
`stripe-connect` (HOA payout onboarding), `create-plan-checkout` (app subscription),
`stripe-webhook` (shared; routes by `metadata.kind`), `cancel-subscription`.

### Step by step

1. **Create a Stripe account** at [dashboard.stripe.com](https://dashboard.stripe.com). Do the
   whole setup in **Test mode** first (toggle, top-right), then repeat in Live mode to go live.

2. **Enable Connect** (so each HOA can receive dues): Dashboard → **Connect** → Get started →
   choose a **Platform or marketplace**. Fill in your platform business profile and branding.
   The app onboards each HOA as a Stripe **Express** account.

3. **Copy your secret key**: Developers → **API keys** → *Secret key* (`sk_test_...` /
   `sk_live_...`), then set it (note the capital `S`):
   ```bash
   supabase secrets set Stripe_api_key=sk_live_...
   ```

4. **Add the webhook**: Developers → **Webhooks** → *Add endpoint*.
   - **Endpoint URL**: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - **Events**: `checkout.session.completed`, `payment_intent.succeeded`,
     `customer.subscription.deleted`, `account.updated`.
   - Save, then copy the endpoint's **Signing secret** (`whsec_...`):
   ```bash
   supabase secrets set Stripe_webhook=whsec_...
   ```
   Resident payments are destination charges created on your platform account, so their events
   arrive here automatically. `account.updated` (an HOA finishing payout onboarding) is a
   *Connect* event — tick **"Listen to events on connected accounts"** on the endpoint to get it
   in real time. It is optional: the app also refreshes each HOA's status whenever an admin opens
   **HOA → Payment Settings**.

5. **Set the redirect base** so post-checkout redirects land on your domain:
   ```bash
   supabase secrets set APP_BASE_URL=https://naborhoa.com
   ```

6. **Deploy** so the functions pick everything up: `supabase functions deploy`.

You do **not** need to create any Products or Prices in Stripe — the app builds line items
inline for both plans and dues.

### Each HOA connects its own payouts

Online dues stay off until each HOA admin connects a payout account: in-app **HOA → Payment
Settings → Connect with Stripe** runs Stripe Express onboarding (`stripe-connect`). Until it
finishes (`charges_enabled`), residents see a "your HOA hasn't enabled online payments yet"
message. This is per-community and done by the HOA admin, not by you.

### Testing and going live

- In Test mode, pay with card `4242 4242 4242 4242` (any future expiry / any CVC). Use the
  Stripe CLI (`stripe listen --forward-to https://<project-ref>.supabase.co/functions/v1/stripe-webhook`)
  or the dashboard's "Send test webhook" to exercise events.
- To go live: switch the dashboard to Live mode, recreate the webhook there (its signing secret
  differs), and re-set `Stripe_api_key` / `Stripe_webhook` with the live values.

### Canceling the app subscription

There is no in-app cancel button for the platform plan; cancel it from the Stripe Dashboard
(Customers → the subscription → Cancel). The `customer.subscription.deleted` event then marks
the community's `subscription_status = canceled`.

## Migrating your live Base44 data

`scripts/migrate-data.mjs` exports every entity from Base44 and imports it into Supabase,
remapping Base44 user IDs to the new Supabase `auth.users` UUIDs and preserving entity IDs
and timestamps. It is idempotent (safe to re-run).

1. Finish the Supabase setup above (schema pushed, functions deployed).
2. Provide credentials in `.env.migrate` (git-ignored):

   ```bash
   BASE44_APP_ID=your_base44_app_id
   BASE44_SERVICE_TOKEN=your_base44_service_role_api_key
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # dashboard → Settings → API
   ```

3. Install the Base44 SDK just for the export, then run the migration:

   ```bash
   npm install --no-save @base44/sdk
   npm run migrate:export      # Base44 -> ./migration-data/*.json (inspect it)
   npm run migrate:import      # ./migration-data/*.json -> Supabase
   ```

Notes:

- **Passwords can't be exported** (Base44 stores them hashed). Migrated users are created
  with confirmed emails but no password — have them use **"Forgot password"** on first
  login, or send reset links.
- **Uploaded files** keep their original Base44 URLs in the data. Re-hosting those blobs in
  Supabase Storage is an optional follow-up (download each `*_url`, upload to the `uploads`
  bucket, rewrite the URL). Do this before shutting the Base44 app down if you need the files.
- `migration-data/` and `.env.migrate` are git-ignored — never commit live data or secrets.

## Deploying the frontend

The frontend is a static Vite build (`npm run build` → `dist/`). Host `dist/` anywhere
(Vercel, Netlify, Cloudflare Pages, GitHub Pages, or Supabase's own hosting) and set the two
`VITE_SUPABASE_*` variables in your host's environment.

### SPA routing (required)

The app is a single-page app using clean URLs (`react-router` history mode), and it relies on
deep links being shared directly — community links (`/c/:joinCode`), payment links
(`/pay/invoice/:id`), and password-reset links (`/reset-password?token=...`). The host **must
serve `index.html` for any unmatched path**, otherwise opening or refreshing those URLs returns
a 404. Base44 did this automatically; self-hosting needs it configured:

- **Vercel** — `vercel.json` (committed) rewrites all routes to `/index.html`.
- **Netlify / Cloudflare Pages** — `public/_redirects` (committed, ships to `dist/_redirects`)
  does the same.
- **Nginx** — `location / { try_files $uri /index.html; }`
- **Apache** — a `.htaccess` `FallbackResource /index.html` (or the standard rewrite to
  `index.html`).
- **Caddy** — `try_files {path} /index.html`.
- **GitHub Pages** — no server rewrites; copy `dist/index.html` to `dist/404.html` after build,
  or use a hash-router fallback.

### Pointing your domain (e.g. naborhoa.com) at the new host

1. In your host, add `naborhoa.com` as a custom domain and update DNS per its instructions
   (Base44's old DNS records no longer apply).
2. In **Supabase → Authentication → URL Configuration**, set the Site URL to
   `https://naborhoa.com` and add it (plus `http://localhost:5173` for dev) to the redirect
   allow-list — the login, signup-confirm, OAuth, and password-reset flows all redirect back to
   the origin the user is on. Mirror this in `site_url` / `additional_redirect_urls` in
   `supabase/config.toml`.
3. Set the edge-function secret so payment redirects land back on your domain:
   `supabase secrets set APP_BASE_URL=https://naborhoa.com`. (Checkout functions already prefer
   the browser's Origin and only fall back to `APP_BASE_URL`, which now defaults to
   `https://naborhoa.com` if the secret is unset.)

Nothing in the code hardcodes a domain — all in-app links use `window.location.origin`, so the
app works from whatever domain it is served on.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/api/base44Client.js` | Frontend Base44-compatible SDK shim (Supabase-backed) |
| `src/api/supabaseClient.js` | Shared Supabase browser client |
| `src/lib/AuthContext.jsx` | Auth state via Supabase session |
| `supabase/migrations/` | Generated schema, RLS, storage, realtime SQL |
| `supabase/functions/` | 37 Deno Edge Functions + `_shared/` compat layer |
| `supabase/config.toml` | Auth / storage / functions config |
| `scripts/generate-schema.mjs` | Regenerates SQL + entity maps from `base44/entities/*` |
| `scripts/migrate-data.mjs` | Base44 → Supabase data export/import |
| `base44/` | Original entity + function definitions (codegen/migration source only) |
