import { askStructured } from '../anthropic.js'

const SCHEMA = {
  direct_answer: 0, // 0-1: how answerable in 1-2 sentences
  qa_structure: 0, // 0-1: how naturally it maps to Q&A headings
  stats_entities: 0, // 0-1: how much it invites stats/named entities
  overall: 0, // 0-1
  reason: '',
}

/**
 * LLM judge for AI-citation potential — how likely content on this title is to
 * be quoted by AI search engines (ChatGPT/Perplexity/Google AI Overviews).
 */
export async function scoreAiCitation(title, companyDesc = '') {
  const prompt = `Judge how likely a blog with this title is to be CITED by AI search engines (ChatGPT, Perplexity, Google AI Overviews).
Title: "${title}"
${companyDesc ? `Company context: ${companyDesc.slice(0, 600)}` : ''}

Score 0-1 on:
- direct_answer: can it be answered directly in 1-2 quotable sentences?
- qa_structure: does it map cleanly to question-style headings?
- stats_entities: does it invite concrete statistics and named entities?
- overall: overall AI-citation potential.
Give a one-line reason.`
  try {
    const r = await askStructured(prompt, SCHEMA, { temperature: 0.3 })
    const clamp = (n) => Math.max(0, Math.min(1, Number(n) || 0))
    const sub = {
      directAnswer: clamp(r.direct_answer),
      qa: clamp(r.qa_structure),
      stats: clamp(r.stats_entities),
    }
    const overall = r.overall != null ? clamp(r.overall) : (sub.directAnswer + sub.qa + sub.stats) / 3
    return { score: overall, sub, reason: r.reason || '' }
  } catch (err) {
    console.warn('[scoreAiCitation] failed:', err.message)
    return { score: 0.5, sub: { directAnswer: 0.5, qa: 0.5, stats: 0.5 }, reason: 'judge unavailable' }
  }
}
