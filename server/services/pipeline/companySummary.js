import path from 'node:path'
import fs from 'node:fs'
import { env } from '../../env.js'
import { extractText, summarizeCompany } from '../pdf.js'
import { fetchPageText } from '../serpapi.js'
import { ask } from '../anthropic.js'

/**
 * Resolve a company description (n8n PDF-summary chain). Order of preference:
 *  1) cached company.description
 *  2) uploaded doc (PDF) text -> summary
 *  3) company website text -> summary
 */
export async function companySummary(company) {
  if (company.description && company.description.trim()) return company.description.trim()

  // From uploaded doc
  if (company.doc_path) {
    const abs = path.join(env.uploadDir, company.doc_path)
    if (fs.existsSync(abs)) {
      try {
        const text = await extractText(abs)
        if (text) return await summarizeCompany(text, company.name)
      } catch (err) {
        console.warn('[companySummary] doc extract failed:', err.message)
      }
    }
  }

  // From website
  if (company.url) {
    const text = await fetchPageText(company.url, { maxChars: 12000 })
    if (text) {
      const prompt = `Summarize what this company ("${company.name}") does into a 250-400 word factual profile (product/service, features, target customers, differentiators), using only this homepage text:\n\n${text}`
      try {
        return (await ask(prompt, { temperature: 0.3 })).trim()
      } catch (err) {
        console.warn('[companySummary] url summarize failed:', err.message)
      }
    }
  }

  return `${company.name} is the company this blog is written for.`
}
