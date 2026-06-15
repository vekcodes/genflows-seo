import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env from the repo root (one level up from /server)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

// dotenv writes empty strings for unset keys; an empty ANTHROPIC_API_KEY/
// ANTHROPIC_AUTH_TOKEN still "wins" its precedence slot in the SDK and breaks
// auth. Strip blanks so the SDK resolves the intended credential.
for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN']) {
  if (process.env[k] != null && process.env[k].trim() === '') delete process.env[k]
}
// If using OAuth, make sure a stray API key doesn't get sent alongside it
// (the API rejects requests carrying both).
if (process.env.ANTHROPIC_AUTH_TOKEN) delete process.env.ANTHROPIC_API_KEY

const repoRoot = path.resolve(__dirname, '..')
const resolveFromRoot = (p) => (path.isAbsolute(p) ? p : path.resolve(repoRoot, p))

export const env = {
  repoRoot,
  port: Number(process.env.PORT) || 8787,
  databasePath: resolveFromRoot(process.env.DATABASE_PATH || './data/app.db'),
  uploadDir: resolveFromRoot(process.env.UPLOAD_DIR || './server/uploads'),

  // Claude auth (OAuth subscription token preferred; API key as alternative).
  anthropicAuthToken: process.env.ANTHROPIC_AUTH_TOKEN || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',

  serpapiKey: process.env.SERPAPI_KEY || '',

  models: {
    default: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-opus-4-8',
    blog: process.env.ANTHROPIC_MODEL_BLOG || 'claude-opus-4-8',
    plagiarism: process.env.ANTHROPIC_MODEL_PLAGIARISM || 'claude-opus-4-8',
  },

  autoresearch: {
    defaultRounds: Number(process.env.AUTORESEARCH_DEFAULT_ROUNDS) || 3,
    candidatesPerRound: Number(process.env.AUTORESEARCH_CANDIDATES_PER_ROUND) || 8,
  },
  autopilotDefaultCadence: Number(process.env.AUTOPILOT_DEFAULT_CADENCE) || 3,
}

/** True if some Claude credential is explicitly configured (profile can't be detected here). */
export const authConfigured = Boolean(env.anthropicAuthToken || env.anthropicApiKey)
