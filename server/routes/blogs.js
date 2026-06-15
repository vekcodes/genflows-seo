import { Router } from 'express'
import { Blogs, Entries, Companies } from '../db/models.js'
import { subscribe, emitter } from '../lib/progress.js'
import { runDetached } from '../lib/jobs.js'

const router = Router()

router.get('/blogs', (req, res) => {
  const { companyId } = req.query
  if (!companyId) return res.status(400).json({ error: 'companyId query param required' })
  res.json(Blogs.listByCompany(companyId))
})

router.get('/blogs/:blogId', (req, res) => {
  const blog = Blogs.get(req.params.blogId)
  if (!blog) return res.status(404).json({ error: 'blog not found' })
  res.json(blog)
})

// SSE live stage progress
router.get('/blogs/:blogId/stream', (req, res) => {
  subscribe(req.params.blogId, req, res)
})

// Trigger generation for a calendar entry.
router.post('/calendar/:entryId/generate', async (req, res, next) => {
  try {
    const entry = Entries.get(req.params.entryId)
    if (!entry) return res.status(404).json({ error: 'entry not found' })

    const company = Companies.get(entry.company_id)
    const blog = Blogs.create({
      company_id: entry.company_id,
      calendar_entry_id: entry.id,
      title: entry.title,
      company_name: company?.name || null,
      company_url: company?.url || null,
      stage: 'queued',
    })
    Entries.update(entry.id, { status: 'generating', blog_id: blog.id })

    const { runPipeline } = await import('../services/pipeline/index.js')
    const emit = emitter(blog.id)
    runDetached(
      () => runPipeline(blog.id, emit),
      (err) => {
        Blogs.update(blog.id, { stage: 'error', error: err.message })
        Entries.update(entry.id, { status: 'error' })
        emit('error', { message: err.message })
      },
    )

    res.status(202).json({ blogId: blog.id })
  } catch (err) {
    next(err)
  }
})

export default router
