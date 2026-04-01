# CreditClear Operations Checklist

This document covers launch items that cannot be fully enforced from application code alone.

## Required before public launch

1. Create a staging deployment in Vercel with its own environment variables.
2. Point `APP_URL`, `VITE_APP_URL`, and `ALLOWED_ORIGINS` to the correct staging and production domains.
3. Configure Supabase daily backups or your external backup provider and verify restore access.
4. Enable Sentry with `VITE_SENTRY_DSN` and confirm one test exception appears in the Sentry project.
5. Enable Google Analytics 4 with `VITE_GA_MEASUREMENT_ID` and confirm page views/events arrive.
6. Connect the final domain and confirm HTTP redirects to HTTPS.
7. Re-run the full manual sign-off flow in an incognito window against staging and production.

## Manual QA script

1. Visit `/` in an incognito window and confirm the landing page renders without console errors.
2. Create a new account and verify the trial is visible on `/dashboard`.
3. Start a new dispute, upload a valid file, generate letters, and confirm the dispute saves.
4. Reload, reopen the saved dispute, edit a letter, and confirm the edit persists.
5. Attempt an oversized upload and verify the UI shows a friendly validation error.
6. Attempt sign-in with an invalid password and verify the UI shows a clear auth error.
7. Complete Stripe checkout in test mode and confirm `/billing` reflects the updated subscription state after the webhook fires.
8. Cancel or expire the subscription and confirm premium generation is gated.
9. Test Chrome, Safari, and Firefox manually on desktop and mobile hardware.

## Backup strategy

- Supabase project backups must be enabled at the platform level.
- Export schema snapshots before major production changes.
- Keep a secure copy of production env vars outside the repo.
- Test a restore path before launch; backups are not real until restore succeeds.

## Monitoring plan

- Sentry should capture frontend runtime crashes and unhandled rejections.
- Vercel function logs should be monitored for API failures and webhook errors.
- Google Analytics should track page views plus critical actions such as signup, checkout, generation, and upload completion.
- Review logs daily during launch week.
