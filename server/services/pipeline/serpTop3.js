import { topLink } from '../serpapi.js'

/**
 * n8n "Ranked 1/2/3" + merge: top organic link for the first 3 questions.
 * Degrades gracefully if SerpAPI is unavailable (returns fewer/empty links).
 */
export async function serpTop3(questions) {
  const picks = questions.slice(0, 3)
  const links = []
  for (const q of picks) {
    try {
      const link = await topLink(q)
      if (link) links.push(link)
    } catch (err) {
      if (err.rateLimited) {
        console.warn('[serpTop3] rate limited — stopping SERP lookups')
        break
      }
    }
  }
  return [...new Set(links)]
}
