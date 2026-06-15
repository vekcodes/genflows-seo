// In-memory pub/sub for live job progress, surfaced over SSE.
// jobId -> { listeners:Set<res>, history:[] }

const jobs = new Map()

function ensure(jobId) {
  let j = jobs.get(jobId)
  if (!j) {
    j = { listeners: new Set(), history: [] }
    jobs.set(jobId, j)
  }
  return j
}

/** Emit an event for a job. type e.g. 'stage' | 'delta' | 'done' | 'error'. */
export function emit(jobId, type, data = {}) {
  const j = ensure(jobId)
  const event = { type, ...data, at: new Date().toISOString() }
  if (type !== 'delta') j.history.push(event) // don't retain token deltas
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const res of j.listeners) {
    try {
      res.write(payload)
    } catch {
      /* listener gone */
    }
  }
  if (type === 'done' || type === 'error') {
    // Give SSE clients a moment, then drop history after a delay.
    setTimeout(() => jobs.delete(jobId), 60_000)
  }
}

/** Attach an Express response as an SSE stream for a job; replays history. */
export function subscribe(jobId, req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.flushHeaders?.()
  const j = ensure(jobId)
  // replay
  for (const event of j.history) {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }
  j.listeners.add(res)
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      /* ignore */
    }
  }, 15_000)
  req.on('close', () => {
    clearInterval(ping)
    j.listeners.delete(res)
  })
}

/** Bind emit to a single jobId for convenience inside pipeline/loop code. */
export function emitter(jobId) {
  return (type, data) => emit(jobId, type, data)
}
