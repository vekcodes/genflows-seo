// Thin client for the GenFlows backend. Same-origin /api (Vite proxies to :8787).

async function req(path, { method = 'GET', body, headers } = {}) {
  const opts = { method, headers: { ...headers } }
  if (body !== undefined && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    opts.body = body
  }
  const res = await fetch(`/api${path}`, opts)
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.error || `${res.status} ${res.statusText}`)
  return data
}

export const api = {
  // Companies
  listCompanies: () => req('/companies'),
  getCompany: (id) => req(`/companies/${id}`),
  createCompany: (body) => req('/companies', { method: 'POST', body }),
  updateCompany: (id, body) => req(`/companies/${id}`, { method: 'PATCH', body }),
  deleteCompany: (id) => req(`/companies/${id}`, { method: 'DELETE' }),
  uploadDoc: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return req(`/companies/${id}/doc`, { method: 'POST', body: fd })
  },

  // Autoresearch
  startAutoresearch: (id, body) => req(`/companies/${id}/autoresearch`, { method: 'POST', body }),
  getRun: (runId) => req(`/autoresearch/${runId}`),
  getCandidates: (runId) => req(`/autoresearch/${runId}/candidates`),

  // Calendar + autopilot
  getCalendar: (id, month) => req(`/companies/${id}/calendar?month=${month}`),
  addEntry: (id, body) => req(`/companies/${id}/calendar`, { method: 'POST', body }),
  updateEntry: (entryId, body) => req(`/calendar/${entryId}`, { method: 'PATCH', body }),
  deleteEntry: (entryId) => req(`/calendar/${entryId}`, { method: 'DELETE' }),
  scheduleAutopilot: (id, body) => req(`/companies/${id}/autopilot/schedule`, { method: 'POST', body }),

  // Blogs
  listBlogs: (companyId) => req(`/blogs?companyId=${companyId}`),
  getBlog: (blogId) => req(`/blogs/${blogId}`),
  generate: (entryId) => req(`/calendar/${entryId}/generate`, { method: 'POST' }),
}

/** Subscribe to an SSE stream. Returns an unsubscribe fn. */
export function streamEvents(path, onEvent) {
  const es = new EventSource(`/api${path}`)
  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data))
    } catch {
      /* ignore pings */
    }
  }
  es.onerror = () => {
    /* browser auto-reconnects; history is replayed */
  }
  return () => es.close()
}

export const streamBlog = (blogId, onEvent) => streamEvents(`/blogs/${blogId}/stream`, onEvent)
export const streamRun = (runId, onEvent) => streamEvents(`/autoresearch/${runId}/stream`, onEvent)
