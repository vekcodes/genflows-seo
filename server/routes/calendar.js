import { Router } from 'express'
import { Companies, Entries, Runs, Candidates } from '../db/models.js'
import { scheduleTopics } from '../services/autoresearch/autopilot.js'

const router = Router()

// Month grid: GET /companies/:id/calendar?month=YYYY-MM
router.get('/companies/:id/calendar', (req, res) => {
  const company = Companies.get(req.params.id)
  if (!company) return res.status(404).json({ error: 'company not found' })
  const month = req.query.month || new Date().toISOString().slice(0, 7)
  res.json({ month, entries: Entries.listByMonth(req.params.id, month) })
})

// Manual entry
router.post('/companies/:id/calendar', (req, res) => {
  const company = Companies.get(req.params.id)
  if (!company) return res.status(404).json({ error: 'company not found' })
  const { title, scheduledDate, scheduled_date } = req.body || {}
  const date = scheduledDate || scheduled_date
  if (!title || !date) return res.status(400).json({ error: 'title and scheduledDate are required' })
  const entry = Entries.create({
    company_id: req.params.id,
    title: title.trim(),
    scheduled_date: date,
    source: 'manual',
  })
  res.status(201).json(entry)
})

router.patch('/calendar/:entryId', (req, res) => {
  const entry = Entries.get(req.params.entryId)
  if (!entry) return res.status(404).json({ error: 'entry not found' })
  const fields = {}
  for (const k of ['title', 'status', 'blog_id']) if (k in (req.body || {})) fields[k] = req.body[k]
  if ('scheduledDate' in (req.body || {})) fields.scheduled_date = req.body.scheduledDate
  if ('scheduled_date' in (req.body || {})) fields.scheduled_date = req.body.scheduled_date
  res.json(Entries.update(req.params.entryId, fields))
})

router.delete('/calendar/:entryId', (req, res) => {
  const entry = Entries.get(req.params.entryId)
  if (!entry) return res.status(404).json({ error: 'entry not found' })
  Entries.remove(req.params.entryId)
  res.json({ ok: true })
})

// Autopilot: place top winners from the latest done run across a month.
// POST /companies/:id/autopilot/schedule { month?, runId?, count? }
router.post('/companies/:id/autopilot/schedule', (req, res) => {
  const company = Companies.get(req.params.id)
  if (!company) return res.status(404).json({ error: 'company not found' })

  const { month, runId, count } = req.body || {}
  const run = runId ? Runs.get(runId) : Runs.latest(req.params.id)
  if (!run) return res.status(400).json({ error: 'no completed autoresearch run found — run autoresearch first' })

  const winners = Candidates.topWinners(run.id, count || 12)
  if (!winners.length) return res.status(400).json({ error: 'no candidates to schedule' })

  const created = scheduleTopics({
    company,
    winners,
    month: month || new Date().toISOString().slice(0, 7),
  })
  res.json({ scheduled: created.length, entries: created })
})

export default router
