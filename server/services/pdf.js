import fs from 'node:fs'
// Import the lib entry directly to avoid pdf-parse's debug block (which reads a
// bundled test PDF when imported as the package main).
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { env } from '../env.js'
import { ask } from './anthropic.js'

export async function extractText(absPath) {
  const buf = fs.readFileSync(absPath)
  const data = await pdfParse(buf)
  return (data.text || '').trim()
}

/**
 * Summarize raw company text (from a PDF or pasted) into a concise company
 * description used throughout the pipeline. Falls back to a truncated excerpt
 * if no OpenRouter key is configured yet.
 */
export async function summarizeCompany(text, companyName) {
  const trimmed = (text || '').slice(0, 24000)
  if (!trimmed) return ''
  if (!env.openrouterApiKey) return trimmed.slice(0, 1500)

  const prompt = `Summarize the following source material about the company "${companyName || 'the company'}" into a clear, factual company profile (250-400 words). Cover: what the company does, its product/service, key features, target customers/niche, and differentiators. Use only information present in the source. Output plain prose, no headings.\n\nSOURCE:\n${trimmed}`
  try {
    return (await ask(prompt, { temperature: 0.3 })).trim()
  } catch (err) {
    console.warn('[pdf] summarize failed, storing excerpt:', err.message)
    return trimmed.slice(0, 1500)
  }
}
