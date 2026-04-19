declare global {
  interface Window {
    __ENV__?: Record<string, string>
  }
}

/**
 * Public config for the browser. On Railway/Node we inject `window.__ENV__` from `/env.js`
 * at runtime so `VITE_*` values are not stuck from an old CI build.
 */
export function getPublicEnv(key: keyof ImportMetaEnv): string | undefined {
  if (typeof window !== 'undefined' && window.__ENV__) {
    const live = window.__ENV__[key as string]
    if (typeof live === 'string' && live.length > 0) {
      return live
    }
  }
  const baked = import.meta.env[key]
  return typeof baked === 'string' && baked.length > 0 ? baked : undefined
}
