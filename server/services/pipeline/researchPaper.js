import { ask } from '../anthropic.js'
import { fetchPageText } from '../serpapi.js'

/**
 * n8n "PC" + "RS": build a research-paper prompt from the topic, company
 * summary and the 3 ranked links, then generate a detailed research paper used
 * as the primary source for the blog.
 */
export async function researchPaper({ title, companyName, companyDesc, links }) {
  // Pull excerpts from the ranked competitor pages to ground the research.
  const excerpts = []
  for (const link of links.slice(0, 3)) {
    const text = await fetchPageText(link, { maxChars: 4000 })
    if (text) excerpts.push(`SOURCE (${link}):\n${text}`)
  }
  const sources = excerpts.length ? excerpts.join('\n\n') : '(no external sources could be fetched)'

  const prompt = `You are a research analyst. Write an in-depth, well-structured research paper about: "${title}".

Dig into every angle of the topic. Also explain how ${companyName} fits in and could be the best tool/service/platform for the reader, using this company summary:
"""${companyDesc}"""

Incorporate relevant facts, statistics, and named entities from these sources where useful:
${sources}

Requirements:
- Detailed, factual, and organized with clear sections.
- Include concrete statistics, mechanisms, and examples (the blog built from this must be citable by AI search engines).
- Do not invent fake data; ground claims in the sources/company summary.
- Output the research paper only.`

  return (await ask(prompt, { temperature: 0.5 })).trim()
}
