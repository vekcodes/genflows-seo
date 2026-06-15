import { env } from '../../env.js'
import { Runs, Candidates, Companies } from '../../db/models.js'
import { askStructured } from '../anthropic.js'
import { mapLimit } from '../../lib/jobs.js'
import { scoreGoogle } from './scoreGoogle.js'
import { scoreAiCitation } from './scoreAiCitation.js'

const GOOGLE_WEIGHT = 0.5
const AI_WEIGHT = 0.5
const WINNER_THRESHOLD = 0.55

const TITLES_SCHEMA = { titles: ['', ''] }

async function generateCandidates({ companyName, companyDesc, seedPrompt, n, avoid = [] }) {
  const avoidList = avoid.length ? `\nAvoid repeating these: ${avoid.map((t) => `"${t}"`).join(', ')}.` : ''
  const prompt = `Generate ${n} blog topic/title ideas for ${companyName} that are likely to (a) rank on Google and (b) get cited by AI search engines.
Company context: """${(companyDesc || '').slice(0, 1200)}"""
${seedPrompt ? `Focus/seed: ${seedPrompt}` : ''}
Each title should target a real high-intent search, be specific, and be phrasable as a direct question or "how to".${avoidList}`
  const out = await askStructured(prompt, TITLES_SCHEMA, { temperature: 0.9 })
  return (out.titles || []).map((t) => String(t).trim()).filter(Boolean).slice(0, n)
}

/** Mutate a weak title into a stronger variant. */
async function mutateTitle({ title, companyName, companyDesc }) {
  const prompt = `Rewrite this blog title to improve BOTH its Google ranking potential and its AI-citation potential (more specific, direct-answerable, question-shaped, with clear intent):
"${title}"
Company: ${companyName}. Context: ${(companyDesc || '').slice(0, 500)}.`
  const out = await askStructured(prompt, { title: '' }, { temperature: 0.85 })
  return (out.title || '').trim() || title
}

async function scoreCandidate(title, companyDesc) {
  const [g, ai] = await Promise.all([scoreGoogle(title), scoreAiCitation(title, companyDesc)])
  const googleScore = g ? g.score : null
  const aiScore = ai.score
  // If google unavailable, lean fully on AI score.
  const total = googleScore == null ? aiScore : GOOGLE_WEIGHT * googleScore + AI_WEIGHT * aiScore
  return {
    google_score: googleScore,
    ai_citation_score: aiScore,
    total_score: total,
    rationale: { ...ai.sub, reason: ai.reason, googleSignals: g?.signals || null },
  }
}

/**
 * Karpathy-style autoresearch: generate candidates, score on Google-ranking +
 * AI-citation, keep winners, mutate losers, repeat N bounded rounds. Persists
 * every candidate per round and emits progress.
 */
export async function runAutoresearch(runId, emit = () => {}) {
  const run = Runs.get(runId)
  if (!run) throw new Error(`run ${runId} not found`)
  const company = Companies.get(run.company_id)
  if (!company) throw new Error('company not found')

  Runs.update(runId, { status: 'running' })
  emit('stage', { stage: 'start', label: `Generating candidates for ${company.name}` })

  const companyDesc = company.description || ''
  const rounds = Math.max(1, Math.min(6, run.rounds || env.autoresearch.defaultRounds))
  const perRound = env.autoresearch.candidatesPerRound

  let working = await generateCandidates({
    companyName: company.name,
    companyDesc,
    seedPrompt: run.seed_prompt,
    n: perRound,
  })
  const allWinners = []
  const seen = new Set()

  for (let round = 1; round <= rounds; round++) {
    emit('stage', { stage: `round-${round}`, label: `Round ${round}/${rounds}: scoring ${working.length} candidates` })

    const scored = await mapLimit(working, 3, async (title) => ({
      title,
      ...(await scoreCandidate(title, companyDesc)),
    }))
    scored.sort((a, b) => b.total_score - a.total_score)

    const losers = []
    for (const c of scored) {
      const isWinner = c.total_score >= WINNER_THRESHOLD
      const id = Candidates.create({
        run_id: runId,
        company_id: company.id,
        title: c.title,
        round,
        google_score: c.google_score,
        ai_citation_score: c.ai_citation_score,
        total_score: c.total_score,
        status: isWinner ? 'winner' : round === rounds ? 'killed' : 'mutated',
        rationale: c.rationale,
      })
      seen.add(c.title.toLowerCase())
      if (isWinner) allWinners.push({ id, ...c })
      else losers.push(c)

      emit('candidate', {
        round,
        title: c.title,
        google: c.google_score,
        ai: c.ai_citation_score,
        total: Number(c.total_score.toFixed(3)),
        status: isWinner ? 'winner' : 'mutate',
      })
    }

    if (round === rounds) break

    // Mutate losers into the next working set; top up with fresh ideas.
    const mutated = await mapLimit(losers.slice(0, perRound), 3, (c) =>
      mutateTitle({ title: c.title, companyName: company.name, companyDesc }),
    )
    let next = mutated.filter((t) => t && !seen.has(t.toLowerCase()))
    if (next.length < perRound) {
      const fresh = await generateCandidates({
        companyName: company.name,
        companyDesc,
        seedPrompt: run.seed_prompt,
        n: perRound - next.length,
        avoid: [...seen],
      })
      next = next.concat(fresh.filter((t) => !seen.has(t.toLowerCase())))
    }
    working = next.slice(0, perRound)
    if (!working.length) break
  }

  Runs.update(runId, { status: 'done', finished_at: new Date().toISOString() })
  emit('done', { runId, winners: allWinners.length })
  return allWinners
}
