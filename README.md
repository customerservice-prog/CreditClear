# CreditClear AI

Production-oriented Vite + React SaaS app with:

- Supabase auth for email/password and Google OAuth
- A real `7-day` no-card trial stored in Supabase
- Stripe checkout after trial expiration for the `$49/month` plan
- Stripe billing portal access for subscription management
- Claude-powered dispute-draft generation through server-only Vercel APIs
- Saved disputes, letters, and uploads in Supabase
- Original dark luxury UI preserved and adapted into a routed app

## Security highlights

- Secrets stay server-side; only `VITE_*` variables are exposed to the client.
- Supabase RLS is required on every user-data table and the included `supabase/schema.sql` now locks `subscriptions` to server-managed writes only.
- The AI generation route verifies auth, checks subscription/trial access server-side, resolves uploads from DB records owned by the caller, and rate-limits repeated generation attempts.
- Upload metadata is validated server-side and must stay inside the authenticated user's storage prefix.
- Vercel response headers include CSP, `X-Frame-Options`, `nosniff`, HSTS, and related hardening headers.

## Core behavior

- Visitors start on `/` and open the auth modal from any CTA.
- After signup, users immediately get trial access without entering a card.
- `/app` requires login. The dispute engine remains usable while the trial is active or a subscription is active.
- After the trial expires, the app shows a billing gate and starts Stripe Checkout when the user continues.
- Active subscribers can open Stripe's billing portal from `/billing`.
- Every completed dispute is stored so users can revisit it in `My Disputes`.
- Users can edit saved draft letters, copy them, and export `.txt` versions.

## Environment variables

Copy `.env.example` to `.env.local` for local development and fill in:

```bash
VITE_APP_NAME=
VITE_APP_ENV=
VITE_APP_URL=
VITE_GA_MEASUREMENT_ID=
VITE_SENTRY_DSN=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=

APP_URL=
ALLOWED_ORIGINS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=

AI_API_KEY=
AI_MODEL_NAME=

# Optional provider-specific alias
ANTHROPIC_API_KEY=
```

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Run `supabase/schema.sql` in the Supabase SQL editor.

3. In Supabase Auth:

- Enable `Email`.
- Enable `Google`.
- Set site URL to `http://localhost:5173`.
- Add redirect URLs:
  - `http://localhost:5173/login`
  - `http://localhost:5173/signup`
  - `http://localhost:5173/dashboard`
  - `http://localhost:5173/billing`
  - `http://localhost:5173`

4. In Stripe:

- Create one monthly recurring product for `$49`.
- Put its `price_...` id into `STRIPE_PRICE_ID`.
- Create a webhook to `https://your-domain.vercel.app/api/stripe-webhook` or a local tunnel URL.
- Subscribe to:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

5. Create the storage bucket if it does not already exist:

- Bucket name: `private-uploads`
- Visibility: private

6. Start local development:

```bash
# Frontend-only Vite UI
npm run dev

# Full app with Vercel serverless routes
npm run dev:full

# Security/unit tests
npm test
```

## AI integration

`/api/generate-dispute-draft` sends the selected agencies, selected issues, personal info, and uploaded report files to the configured AI provider.

- The AI key stays server-side.
- The endpoint returns streamed server-sent events.
- The frontend adds letters progressively as they arrive.
- Output is intentionally framed as editable draft assistance, not guaranteed outcomes or legal advice.
- A lightweight in-memory rate limit guards repeated generation bursts per user/session.
- OpenAI keys in `AI_API_KEY` use `gpt-4.1-mini` by default.
- Anthropic keys can still be used through `ANTHROPIC_API_KEY` or an `AI_API_KEY` that starts with `sk-ant-`.

## Monitoring and analytics

- Frontend crash reporting is wired for Sentry via `VITE_SENTRY_DSN`.
- Page views and key CTA events are wired for Google Analytics 4 via `VITE_GA_MEASUREMENT_ID`.
- Browser-facing API routes enforce an origin allowlist via `ALLOWED_ORIGINS`.
- See `docs/OPERATIONS.md` for staging, backups, DNS/HTTPS, and final manual QA steps that must be completed outside the repo.

## Vercel deployment

1. Import the repo into Vercel.
2. Set `Build Command` to `npm run build`.
3. Set `Output Directory` to `dist`.
4. Add every variable from `.env.example`.
5. Set `APP_URL` and `VITE_APP_URL` to the production domain.
6. Add the same production URLs to Supabase Auth.
7. Point Stripe webhooks to `https://your-domain.vercel.app/api/stripe-webhook`.
8. Set `ALLOWED_ORIGINS` to your staging/production domains.
9. Add `VITE_SENTRY_DSN` and `VITE_GA_MEASUREMENT_ID` if you want production monitoring enabled at launch.

## Project structure

```text
src/
  app/
    App.tsx
    main.tsx
    router.tsx
  components/
    layout/
      AppShell.tsx
    AuthModal.tsx
    Navbar.tsx
    PricingCard.tsx
  context/
    AuthContext.tsx
    AuthContextValue.ts
    SubscriptionContext.tsx
    SubscriptionContextValue.ts
    useAuthContext.ts
    useSubscriptionContext.ts
  hooks/
    useAuth.ts
    useDisputes.ts
    useSubscription.ts
    useUploads.ts
  lib/
    api.ts
    apiClient.ts
    claude.ts
    constants.ts
    formatters.ts
    stripe.ts
    supabase.ts
    supabaseClient.ts
    validators.ts
  pages/
    App.tsx
    BillingPage.tsx
    DashboardPage.tsx
    DisputeDetailPage.tsx
    Home.tsx
    HomePage.tsx
    LegalPage.tsx
    LoginPage.tsx
    NewDisputePage.tsx
    NotFoundPage.tsx
    SettingsPage.tsx
    SignupPage.tsx
  styles/
    globals.css
    theme.css
  App.tsx
  index.css
  main.tsx
  types.ts
api/
  _lib/
    env.js
    rate-limit.js
    stripe.js
    supabase-admin.js
  create-checkout.js
  create-portal.js
  generate-dispute-draft.js
  generate-letters.js
  save-upload-metadata.js
  stripe-webhook.js
  webhook.js
supabase/
  schema.sql
```

## Notes

- `npm run dev` is enough for UI work, but `npm run dev:full` is the correct local command when testing `/api/*`, Stripe flows, or AI generation.
- Re-run `supabase/schema.sql` after pulling the latest changes so the tightened RLS policies and new constraints are applied before launch.
- The client never receives `AI_API_KEY` / `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, or the Supabase service-role key.
- Trial access is controlled from `subscriptions.trial_ends_at`.
- Stripe webhooks update the `subscriptions` table with paid status.
- Upload metadata is stored in the `uploads` table and the files themselves live in the private `private-uploads` storage bucket.
- Generated outputs are drafts for review only; users should verify all information before using them.
- Automated backups, live domain/DNS, and staging parity must still be configured in Supabase/Vercel; the repo now documents those steps but cannot enable them for you.
