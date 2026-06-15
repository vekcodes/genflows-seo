import { askStructured } from '../anthropic.js'
import { fetchPageText } from '../serpapi.js'

const SCHEMA = {
  one_word_keywords: [{ keyword: '', density: 0 }],
  two_word_keywords: [{ keyword: '', density: 0 }],
  three_word_keywords: [{ keyword: '', density: 0 }],
}

/**
 * n8n "KD": analyze the top-3 ranked pages for important keywords by density,
 * then flatten + dedupe into a single keyword list (n8n "Code in JavaScript6").
 */
export async function keywordDensity(links) {
  const all = []
  for (const url of links.slice(0, 3)) {
    const text = await fetchPageText(url, { maxChars: 9000 })
    if (!text) continue
    const prompt = `Analyze the content below from ${url}. Identify the most important keywords by density relative to total word count:
- one-word keywords used >= 4%
- two-word phrases used >= 2%
- three-word phrases used >= 1%
Ignore navigation/boilerplate. CONTENT:\n${text}`
    try {
      const out = await askStructured(prompt, SCHEMA)
      for (const group of ['one_word_keywords', 'two_word_keywords', 'three_word_keywords']) {
        for (const kw of out[group] || []) {
          if (kw?.keyword) all.push(kw.keyword.trim())
        }
      }
    } catch (err) {
      console.warn('[keywordDensity] analysis failed for', url, err.message)
    }
  }
  // dedupe (case-insensitive), keep order
  const seen = new Set()
  const keywords = []
  for (const k of all) {
    const key = k.toLowerCase()
    if (k && !seen.has(key)) {
      seen.add(key)
      keywords.push(k)
    }
  }
  return keywords
}
