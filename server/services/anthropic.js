import Anthropic from '@anthropic-ai/sdk'
import { env } from '../env.js'
import { extractJson } from '../lib/json.js'

// Auth resolution:
//  1. ANTHROPIC_AUTH_TOKEN  -> OAuth (Claude subscription); send the oauth beta header
//  2. ANTHROPIC_API_KEY     -> standard API key
//  3. neither set           -> SDK resolves an `ant auth login` profile / env (OAuth)
const usingApiKey = Boolean(env.anthropicApiKey) && !env.anthropicAuthToken

let _client = null
function client() {
  if (_client) return _client
  const opts = {}
  if (env.anthropicAuthToken) opts.authToken = env.anthropicAuthToken
  else if (env.anthropicApiKey) opts.apiKey = env.anthropicApiKey
  // OAuth (token or profile) requires the oauth beta header on /v1/messages.
  if (!usingApiKey) opts.defaultHeaders = { 'anthropic-beta': 'oauth-2025-04-20' }
  try {
    _client = new Anthropic(opts)
  } catch (err) {
    throw new Error(
      'No Claude credential found. Run `claude setup-token` and put the result in .env as ' +
        'ANTHROPIC_AUTH_TOKEN=sk-ant-oat… (or set ANTHROPIC_API_KEY), then restart the API. ' +
        `[SDK: ${err.message}]`,
    )
  }
  return _client
}

const textOf = (msg) =>
  (msg.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()

/** Non-streaming message. Opus 4.8: no temperature/top_p (they 400). */
export async function chat({ model = env.models.default, system, messages, maxTokens = 16000, signal }) {
  const msg = await client().messages.create(
    { model, max_tokens: maxTokens, ...(system ? { system } : {}), messages },
    { signal },
  )
  return textOf(msg)
}

/** Single user prompt -> text. */
export function ask(prompt, { model = env.models.default, system } = {}) {
  return chat({ model, system, messages: [{ role: 'user', content: prompt }] })
}

/**
 * Structured output: instruct JSON-only against an example shape, parse
 * tolerantly, retry once on parse failure. (Prompt-based rather than the
 * json_schema constraint, so arbitrary example shapes work.)
 */
export async function askStructured(prompt, schemaExample, { model = env.models.default } = {}) {
  const shape = typeof schemaExample === 'string' ? schemaExample : JSON.stringify(schemaExample, null, 2)
  const system =
    'You output ONLY valid minified JSON that matches the requested shape. No prose, no markdown, no code fences.'
  const full = `${prompt}\n\nRespond with JSON ONLY, matching this shape exactly:\n${shape}`

  const first = await chat({ model, system, messages: [{ role: 'user', content: full }] })
  try {
    return extractJson(first)
  } catch {
    const retry = await chat({
      model,
      system,
      messages: [
        { role: 'user', content: full },
        { role: 'assistant', content: first },
        { role: 'user', content: 'That was not valid JSON. Return ONLY the JSON value, nothing else.' },
      ],
    })
    return extractJson(retry)
  }
}

/**
 * Streaming message. Calls onDelta(textChunk) as tokens arrive and returns the
 * full text. Use for long outputs (the 4000-word blog) to avoid HTTP timeouts.
 */
export async function chatStream({ model = env.models.blog, system, messages, maxTokens = 64000, signal, onDelta }) {
  const stream = client().messages.stream(
    { model, max_tokens: maxTokens, ...(system ? { system } : {}), messages },
    { signal },
  )
  if (onDelta) stream.on('text', (t) => onDelta(t))
  const final = await stream.finalMessage()
  return textOf(final)
}
