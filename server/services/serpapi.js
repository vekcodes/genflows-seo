import { env } from '../env.js'

const cache = new Map() // query -> organic_results (per-process cache)

/** Raw Google search via SerpAPI. Returns parsed JSON or throws. */
export async function search(q) {
  if (cache.has(q)) return cache.get(q)
  if (!env.serpapiKey) throw new Error('SERPAPI_KEY not set')

  const params = new URLSearchParams({
    engine: 'google',
    q,
    location: 'United States',
    google_domain: 'google.com',
    gl: 'us',
    hl: 'en',
    api_key: env.serpapiKey,
  })
  const res = await fetch(`https://serpapi.com/search?${params}`)
  if (res.status === 429) throw Object.assign(new Error('SerpAPI rate limited'), { rateLimited: true })
  if (!res.ok) throw new Error(`SerpAPI ${res.status}: ${res.statusText}`)
  const data = await res.json()
  cache.set(q, data)
  return data
}

/** Top organic result link for a query (n8n "Code in JavaScript" extraction). */
export async function topLink(q) {
  try {
    const data = await search(q)
    return data.organic_results?.[0]?.link || null
  } catch (err) {
    if (err.rateLimited) throw err
    console.warn('[serpapi] topLink failed for', q, err.message)
    return null
  }
}

/** Lightweight signals from a SERP, used by autoresearch google-scoring. */
export async function serpSignals(q) {
  const data = await search(q)
  const organic = data.organic_results || []
  return {
    totalResults: Number(data.search_information?.total_results) || null,
    organicCount: organic.length,
    hasAnswerBox: Boolean(data.answer_box),
    relatedQuestions: (data.related_questions || []).length,
    topDomains: organic.slice(0, 10).map((r) => {
      try {
        return new URL(r.link).hostname.replace(/^www\./, '')
      } catch {
        return ''
      }
    }),
  }
}

/** Fetch a page and strip to plain text (best-effort; returns '' on failure). */
export async function fetchPageText(url, { maxChars = 8000 } = {}) {
  if (!url) return ''
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GenFlowsBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return text.slice(0, maxChars)
  } catch {
    return ''
  }
}
