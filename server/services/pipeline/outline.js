import { askStructured } from '../anthropic.js'

const SCHEMA = [{ h2: '', h3: ['', ''] }]

/**
 * n8n "OT-PC" + "OT": H2/H3 outline driven by high-search questions, the
 * company angle, and the research paper. Returns [{h2, h3:[]}].
 */
export async function outline({ title, questions, companyName, companyDesc, researchPaper }) {
  const qList = questions.slice(0, 10).map((q, i) => `${i + 1}. ${q}`).join('\n')
  const prompt = `Create an H2/H3 outline for a ~4000-word blog titled: "${title}".

Rules:
- The H2s and H3s must be high-search Google questions. Incorporate these where relevant:
${qList}
- Phrase headings as direct questions wherever possible (this maximizes AI-search citation).
- Some headings should naturally show how ${companyName} is the best tool/service/platform, using this summary: """${companyDesc}"""
- Base substance on this research paper: """${(researchPaper || '').slice(0, 6000)}"""
- Produce roughly 10-12 H2 sections, each with 3-4 H3s.`
  const arr = await askStructured(prompt, SCHEMA)
  // normalize
  return (Array.isArray(arr) ? arr : []).map((s) => ({
    h2: s.h2 || '',
    h3: Array.isArray(s.h3) ? s.h3.filter(Boolean) : [],
  }))
}

/** Format outline array into the readable text the blog stage consumes. */
export function formatOutline(sections) {
  return sections
    .map((s) => `H2: ${s.h2}\n${s.h3.map((h) => `H3: ${h}`).join('\n')}`)
    .join('\n\n')
}
