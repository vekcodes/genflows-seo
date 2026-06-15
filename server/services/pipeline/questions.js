import { askStructured } from '../anthropic.js'

const SCHEMA = Object.fromEntries(
  Array.from({ length: 15 }, (_, i) => [`most_googled_question${i + 1}`, '']),
)

/** n8n "MSQ": 15 most-googled questions about the topic. Returns string[15]. */
export async function googledQuestions(title) {
  const prompt = `Give me the 15 most-googled questions people search about this topic: "${title}". Return real, natural-language questions that searchers type into Google.`
  const out = await askStructured(prompt, SCHEMA)
  return Object.keys(SCHEMA)
    .map((k) => out[k])
    .filter((v) => v && String(v).trim())
}
