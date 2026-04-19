declare global {
  interface Window {
    __ENV__?: Record<string, string>
  }
}

type RuntimeInjectedKey = 'OWNER_FREE_ACCESS_EMAILS' | 'ADMIN_EMAIL' | 'VITE_OFFLINE_DRAFTS'

export type PublicEnvKey = keyof ImportMetaEnv | RuntimeInjectedKey

/**
 * Public config for the browser. On Railway/Node we inject `window.__ENV__` from `/env.js`
 * at runtime so `VITE_*` values are not stuck from an old CI build.
 */
export function getPublicEnv(key: PublicEnvKey): string | undefined {
  if (typeof window !== 'undefined' && window.__ENV__) {
    const live = window.__ENV__[key as string]
    if (typeof live === 'string' && live.length > 0) {
      return live
    }
  }
  if (key === 'OWNER_FREE_ACCESS_EMAILS' || key === 'ADMIN_EMAIL') {
    return undefined
  }
  const baked = import.meta.env[key as keyof ImportMetaEnv]
  return typeof baked === 'string' && baked.length > 0 ? baked : undefined
}
