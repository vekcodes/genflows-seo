import { ask } from '../anthropic.js'
import { env } from '../../env.js'

/**
 * n8n "P1": paraphrase/de-duplicate pass that preserves the incorporated
 * keywords and the markdown structure. Returns the final blog content.
 */
export async function plagiarismPass({ content, keywords }) {
  const kw = (keywords || []).slice(0, 16).join(', ')
  const prompt = `Review the blog below and rewrite any generic or templated passages so the whole piece reads as original, natural, human-written content. Do NOT remove these important keywords (keep their density): ${kw}.

Keep the markdown formatting, headings, structure, and length intact. Output only the final blog, nothing else.

BLOG:
${content}`
  return (await ask(prompt, { model: env.models.plagiarism, temperature: 0.6 })).trim()
}
