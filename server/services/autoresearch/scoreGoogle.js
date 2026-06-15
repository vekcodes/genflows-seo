import { serpSignals } from '../serpapi.js'

// Mega-authority domains that are hard to outrank — their presence in the top
// results lowers ranking potential for a new entrant.
const AUTHORITY = new Set([
  'wikipedia.org',
  'youtube.com',
  'amazon.com',
  'linkedin.com',
  'forbes.com',
  'hubspot.com',
  'g2.com',
  'gartner.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'investopedia.com',
])

/**
 * SerpAPI-derived ranking-potential signal (0-1). Higher = more beatable SERP.
 * Returns null when SerpAPI is unavailable so the loop can degrade to LLM-only.
 */
export async function scoreGoogle(query) {
  try {
    const s = await serpSignals(query)
    if (!s.topDomains.length) return { score: 0.5, signals: s }

    const authorityCount = s.topDomains.filter((d) => AUTHORITY.has(d)).length
    const beatable = 1 - authorityCount / Math.max(1, s.topDomains.length) // fewer giants = better
    // Opportunities: a featured snippet to win and long-tail related questions.
    const snippetOpportunity = s.hasAnswerBox ? 0.1 : 0
    const longTail = Math.min(0.15, s.relatedQuestions * 0.02)

    const score = Math.max(0, Math.min(1, beatable * 0.75 + snippetOpportunity + longTail))
    return { score, signals: s }
  } catch (err) {
    if (err.rateLimited) return null
    console.warn('[scoreGoogle] failed:', err.message)
    return null
  }
}
