import { Router } from 'express'
import { env } from '../env.js'
import { Companies, Runs, Candidates } from '../db/models.js'
import { subscribe, emitter } from '../lib/progress.js'
import { runDetached } from '../lib/jobs.js'

const router = Router()

// Start a bounded autoresearch run.
router.post('/companies/:id/autoresearch', async (req, res, next) => {
  try {
    const company = Companies.get(req.params.id)
    if (!company) return res.status(404).json({ error: 'company not found' })

    const rounds = Number(req.body?.rounds) || env.autoresearch.defaultRounds
    const seedPrompt = req.body?.seedPrompt || null
    const run = Runs.create({ company_id: company.id, rounds, seed_prompt: seedPrompt })

    const { runAutoresearch } = await import('../services/autoresearch/loop.js')
    const emit = emitter(run.id)
    runDetached(
      () => runAutoresearch(run.id, emit),
      (err) => {
        Runs.update(run.id, { status: 'error', error: err.message, finished_at: new Date().toISOString() })
        emit('error', { message: err.message })
      },
    )

    res.status(202).json({ runId: run.id })
  } catch (err) {
    next(err)
  }
})

router.get('/autoresearch/:runId', (req, res) => {
  const run = Runs.get(req.params.runId)
  if (!run) return res.status(404).json({ error: 'run not found' })
  res.json({ ...run, candidates: Candidates.listByRun(run.id) })
})

router.get('/autoresearch/:runId/candidates', (req, res) => {
  const run = Runs.get(req.params.runId)
  if (!run) return res.status(404).json({ error: 'run not found' })
  res.json(Candidates.listByRun(run.id))
})

router.get('/autoresearch/:runId/stream', (req, res) => {
  subscribe(req.params.runId, req, res)
})

export default router
