// Fire-and-forget runner for long in-process jobs. The HTTP handler returns an
// id immediately; progress is delivered via lib/progress.js (SSE).

export function runDetached(fn, onError) {
  Promise.resolve()
    .then(fn)
    .catch((err) => {
      console.error('[job] failed:', err)
      if (onError) {
        try {
          onError(err)
        } catch (e) {
          console.error('[job] onError handler threw:', e)
        }
      }
    })
}

/** Simple bounded-concurrency map (used by autoresearch SERP fan-out). */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
  return results
}
