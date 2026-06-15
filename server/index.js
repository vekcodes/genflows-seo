import express from 'express'
import cors from 'cors'
import { env, authConfigured } from './env.js'
import { migrate } from './db/migrate.js'
import companies from './routes/companies.js'
import autoresearch from './routes/autoresearch.js'
import calendar from './routes/calendar.js'
import blogs from './routes/blogs.js'

// Ensure the schema exists before serving.
migrate()

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Health check (P0)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'genflows-seo-calendar',
    time: new Date().toISOString(),
    claudeAuth: authConfigured ? 'configured' : 'profile-or-none',
    serpapi: Boolean(env.serpapiKey),
  })
})

// Serve uploaded source docs read-only
app.use('/api/uploads', express.static(env.uploadDir))

// Feature routers
app.use('/api', companies)
app.use('/api', autoresearch)
app.use('/api', calendar)
app.use('/api', blogs)

// JSON 404 for unknown /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found', path: req.originalUrl })
})

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[api error]', err)
  res.status(err.status || 500).json({ error: err.message || 'internal_error' })
})

app.listen(env.port, () => {
  console.log(`[api] GenFlows SEO Calendar API listening on http://localhost:${env.port}`)
})
