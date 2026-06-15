// Tolerant extraction of a JSON value from an LLM response that may wrap it in
// prose or ```fences```. Returns the parsed value or throws.

export function extractJson(text) {
  if (text == null) throw new Error('empty LLM response')
  let s = String(text).trim()

  // Strip code fences
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()

  // Fast path
  try {
    return JSON.parse(s)
  } catch {
    // fall through
  }

  // Find the first balanced { } or [ ] block
  const start = s.search(/[[{]/)
  if (start === -1) throw new Error('no JSON found in response')
  const open = s[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) {
        return JSON.parse(s.slice(start, i + 1))
      }
    }
  }
  throw new Error('unbalanced JSON in response')
}
