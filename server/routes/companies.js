import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../env.js'
import { Companies } from '../db/models.js'
import { extractText, summarizeCompany } from '../services/pdf.js'

const router = Router()

// ── Multer: store under uploads/<companyId>/ ────────────
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(env.uploadDir, req.params.id)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(req, file, cb) {
    // keep original name, prefix timestamp to avoid clobbering
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } })

router.get('/companies', (req, res) => {
  res.json(Companies.list())
})

router.post('/companies', (req, res) => {
  const { name, url, description, autopilot_cadence, autopilot_enabled } = req.body || {}
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' })
  const company = Companies.create({
    name: name.trim(),
    url: url || null,
    description: description || null,
    autopilot_cadence: autopilot_cadence ?? env.autopilotDefaultCadence,
    autopilot_enabled: autopilot_enabled ?? 0,
  })
  res.status(201).json(company)
})

router.get('/companies/:id', (req, res) => {
  const company = Companies.get(req.params.id)
  if (!company) return res.status(404).json({ error: 'company not found' })
  res.json(company)
})

router.patch('/companies/:id', (req, res) => {
  const company = Companies.get(req.params.id)
  if (!company) return res.status(404).json({ error: 'company not found' })
  res.json(Companies.update(req.params.id, req.body || {}))
})

router.delete('/companies/:id', (req, res) => {
  const company = Companies.get(req.params.id)
  if (!company) return res.status(404).json({ error: 'company not found' })
  Companies.remove(req.params.id)
  // best-effort cleanup of uploaded files
  fs.rmSync(path.join(env.uploadDir, req.params.id), { recursive: true, force: true })
  res.json({ ok: true })
})

// ── Doc upload: extract text + summarize -> description ──
router.post('/companies/:id/doc', upload.single('file'), async (req, res, next) => {
  try {
    const company = Companies.get(req.params.id)
    if (!company) return res.status(404).json({ error: 'company not found' })
    if (!req.file) return res.status(400).json({ error: 'no file uploaded (field name: file)' })

    const relPath = path.relative(env.uploadDir, req.file.path).split(path.sep).join('/')
    let description = company.description
    try {
      const text = await extractText(req.file.path)
      description = await summarizeCompany(text, company.name)
    } catch (err) {
      console.warn('[companies] PDF extract/summarize failed:', err.message)
    }

    const updated = Companies.update(req.params.id, {
      doc_path: relPath,
      doc_filename: req.file.originalname,
      description,
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

export default router
