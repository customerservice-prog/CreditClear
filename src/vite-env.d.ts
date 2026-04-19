/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_ENV?: string
  readonly VITE_APP_URL?: string
  readonly VITE_SITE_URL?: string
  /** Optional. Injected into `<meta name="google-site-verification">` on the client after GSC verification. */
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string
  /** Optional X (Twitter) @handle for `twitter:site` / `twitter:creator` (no @ prefix). */
  readonly VITE_TWITTER_SITE?: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  /** Optional duplicate of OWNER_FREE_ACCESS_EMAILS for local Vite when /env.js is not used. */
  readonly VITE_OWNER_FREE_ACCESS_EMAILS?: string
  /** Injected at runtime: "1" when no external AI keys (structured drafts only). */
  readonly VITE_OFFLINE_DRAFTS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
