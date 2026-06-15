import { chatStream } from '../anthropic.js'
import { env } from '../../env.js'

/**
 * n8n "P": generate the 4000-word SEO + AI-optimized blog. Streams tokens via
 * onDelta so the UI shows real writing progress. AI-citability levers (direct
 * answers, Q&A headings, stats, named entities) are enforced in the prompt.
 */
export async function generateBlog(
  { title, companyName, companyDesc, researchPaper, keywords, outlineText },
  { onDelta, signal } = {},
) {
  const kw = (keywords || []).slice(0, 13)
  const kwList = kw.map((k) => `"${k}"`).join(', ')

  const prompt = `Generate a 4000-word, fully SEO-optimized AND AI-search-optimized blog titled (very important): "${title}".

The content must be:
- 100% unique, plagiarism-free, high-readability, deeply informative
- Structured so AI search engines (ChatGPT, Perplexity, Google AI Overviews) will CITE it:
  - Open each H2/H3 with a direct, quotable answer (1-2 sentences) before elaborating
  - Use the headings as natural questions
  - Include concrete statistics, numbers, and clearly named entities
  - Use bullet points generously
- Clear user intent; give direct answers to the reader

BRAND MENTIONS — naturally position ${companyName} as the best tool/platform in its category, using this summary:
"""${companyDesc}"""

PRIMARY SOURCE — base the article strictly on this research paper; expand for clarity but do not drift or invent facts:
"""${(researchPaper || '').slice(0, 9000)}"""

CTAs — include an appropriate call-to-action (use the company summary to make it fitting) in the first section, the middle, and the final section.

KEYWORDS — weave these in naturally with strong density (aim ~2-3% each): ${kwList}.

STRUCTURE — follow this H2/H3 outline EXACTLY. Do not add new H2s; expand with bullets, examples, and direct answers under each:
${outlineText}

OUTPUT — clean Markdown (use #/##/### headings, bullet lists, bold). Output only the article.`

  const text = await chatStream({
    model: env.models.blog,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    signal,
    onDelta,
  })
  return text.trim()
}
