/** After a deploy, cached HTML can reference deleted hashed chunks — dynamic import then fails. */
export function isStaleChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /Failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|chunkloaderror|loading chunk .+ failed|failed to load module script/i.test(
    message,
  )
}
