import { randomUUID } from 'node:crypto'
import { db } from './connection.js'

export const newId = () => randomUUID()
export const now = () => new Date().toISOString()

const parse = (v, fallback) => {
  if (v == null) return fallback
  try {
    return JSON.parse(v)
  } catch {
    return fallback
  }
}
const str = (v) => (v == null ? null : JSON.stringify(v))

// ── Companies ───────────────────────────────────────────
const companyOut = (r) => r && { ...r, autopilot_enabled: !!r.autopilot_enabled }

export const Companies = {
  list() {
    return db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all().map(companyOut)
  },
  get(id) {
    return companyOut(db.prepare('SELECT * FROM companies WHERE id = ?').get(id))
  },
  create({ name, url = null, description = null, autopilot_cadence = 3, autopilot_enabled = 0 }) {
    const id = newId()
    const ts = now()
    db.prepare(
      `INSERT INTO companies (id, name, url, description, autopilot_cadence, autopilot_enabled, created_at, updated_at)
       VALUES (@id, @name, @url, @description, @autopilot_cadence, @autopilot_enabled, @created_at, @updated_at)`,
    ).run({
      id,
      name,
      url,
      description,
      autopilot_cadence,
      autopilot_enabled: autopilot_enabled ? 1 : 0,
      created_at: ts,
      updated_at: ts,
    })
    return this.get(id)
  },
  update(id, fields) {
    const allowed = [
      'name',
      'url',
      'description',
      'doc_path',
      'doc_filename',
      'autopilot_cadence',
      'autopilot_enabled',
    ]
    const sets = []
    const params = { id, updated_at: now() }
    for (const k of allowed) {
      if (k in fields) {
        sets.push(`${k} = @${k}`)
        params[k] = k === 'autopilot_enabled' ? (fields[k] ? 1 : 0) : fields[k]
      }
    }
    if (sets.length) {
      db.prepare(`UPDATE companies SET ${sets.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(
        params,
      )
    }
    return this.get(id)
  },
  remove(id) {
    db.prepare('DELETE FROM companies WHERE id = ?').run(id)
  },
}

// ── Autoresearch runs ───────────────────────────────────
export const Runs = {
  get(id) {
    return db.prepare('SELECT * FROM autoresearch_runs WHERE id = ?').get(id)
  },
  listByCompany(companyId) {
    return db
      .prepare('SELECT * FROM autoresearch_runs WHERE company_id = ? ORDER BY created_at DESC')
      .all(companyId)
  },
  latest(companyId) {
    return db
      .prepare(
        "SELECT * FROM autoresearch_runs WHERE company_id = ? AND status = 'done' ORDER BY created_at DESC LIMIT 1",
      )
      .get(companyId)
  },
  create({ company_id, rounds, seed_prompt = null }) {
    const id = newId()
    db.prepare(
      `INSERT INTO autoresearch_runs (id, company_id, status, rounds, seed_prompt, created_at)
       VALUES (?, ?, 'queued', ?, ?, ?)`,
    ).run(id, company_id, rounds, seed_prompt, now())
    return this.get(id)
  },
  update(id, fields) {
    const allowed = ['status', 'error', 'finished_at']
    const sets = []
    const params = { id }
    for (const k of allowed) {
      if (k in fields) {
        sets.push(`${k} = @${k}`)
        params[k] = fields[k]
      }
    }
    if (sets.length) db.prepare(`UPDATE autoresearch_runs SET ${sets.join(', ')} WHERE id = @id`).run(params)
    return this.get(id)
  },
}

// ── Topic candidates ────────────────────────────────────
const candidateOut = (r) => r && { ...r, rationale: parse(r.rationale, null) }

export const Candidates = {
  create(c) {
    const id = newId()
    db.prepare(
      `INSERT INTO topic_candidates
        (id, run_id, company_id, title, round, google_score, ai_citation_score, total_score, status, parent_id, rationale, created_at)
       VALUES (@id, @run_id, @company_id, @title, @round, @google_score, @ai_citation_score, @total_score, @status, @parent_id, @rationale, @created_at)`,
    ).run({
      id,
      run_id: c.run_id,
      company_id: c.company_id,
      title: c.title,
      round: c.round ?? 0,
      google_score: c.google_score ?? null,
      ai_citation_score: c.ai_citation_score ?? null,
      total_score: c.total_score ?? null,
      status: c.status ?? 'candidate',
      parent_id: c.parent_id ?? null,
      rationale: str(c.rationale ?? null),
      created_at: now(),
    })
    return id
  },
  listByRun(runId) {
    return db
      .prepare('SELECT * FROM topic_candidates WHERE run_id = ? ORDER BY round ASC, total_score DESC')
      .all(runId)
      .map(candidateOut)
  },
  topWinners(runId, limit = 12) {
    return db
      .prepare(
        `SELECT * FROM topic_candidates WHERE run_id = ?
         ORDER BY total_score DESC LIMIT ?`,
      )
      .all(runId, limit)
      .map(candidateOut)
  },
}

// ── Calendar entries ────────────────────────────────────
export const Entries = {
  get(id) {
    return db.prepare('SELECT * FROM calendar_entries WHERE id = ?').get(id)
  },
  listByMonth(companyId, month /* 'YYYY-MM' */) {
    return db
      .prepare(
        `SELECT * FROM calendar_entries
         WHERE company_id = ? AND scheduled_date LIKE ?
         ORDER BY scheduled_date ASC`,
      )
      .all(companyId, `${month}-%`)
  },
  occupiedDates(companyId) {
    return new Set(
      db
        .prepare('SELECT scheduled_date FROM calendar_entries WHERE company_id = ?')
        .all(companyId)
        .map((r) => r.scheduled_date),
    )
  },
  create({ company_id, topic_candidate_id = null, title, scheduled_date, source = 'manual' }) {
    const id = newId()
    const ts = now()
    db.prepare(
      `INSERT INTO calendar_entries
        (id, company_id, topic_candidate_id, title, scheduled_date, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?)`,
    ).run(id, company_id, topic_candidate_id, title, scheduled_date, source, ts, ts)
    return this.get(id)
  },
  update(id, fields) {
    const allowed = ['title', 'scheduled_date', 'status', 'blog_id']
    const sets = []
    const params = { id, updated_at: now() }
    for (const k of allowed) {
      if (k in fields) {
        sets.push(`${k} = @${k}`)
        params[k] = fields[k]
      }
    }
    if (sets.length) {
      db.prepare(
        `UPDATE calendar_entries SET ${sets.join(', ')}, updated_at = @updated_at WHERE id = @id`,
      ).run(params)
    }
    return this.get(id)
  },
  remove(id) {
    db.prepare('DELETE FROM calendar_entries WHERE id = ?').run(id)
  },
}

// ── Blogs ───────────────────────────────────────────────
const JSON_COLS = ['file_names', 'doc_paths', 'keywords', 'most_searched_questions', 'top3_ranked_websites']

const blogOut = (r) => {
  if (!r) return r
  const out = { ...r, content_from_ai: !!r.content_from_ai }
  for (const c of JSON_COLS) out[c] = parse(r[c], [])
  return out
}

export const Blogs = {
  get(id) {
    return blogOut(db.prepare('SELECT * FROM blogs WHERE id = ?').get(id))
  },
  listByCompany(companyId) {
    return db
      .prepare('SELECT * FROM blogs WHERE company_id = ? ORDER BY created_at DESC')
      .all(companyId)
      .map(blogOut)
  },
  create(b) {
    const id = b.id || newId()
    const ts = now()
    db.prepare(
      `INSERT INTO blogs (id, company_id, calendar_entry_id, title, company_name, company_url, content_from_ai, stage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    ).run(
      id,
      b.company_id ?? null,
      b.calendar_entry_id ?? null,
      b.title,
      b.company_name ?? null,
      b.company_url ?? null,
      b.stage ?? 'queued',
      ts,
      ts,
    )
    return this.get(id)
  },
  update(id, fields) {
    const cols = [
      'project',
      'content',
      'company_name',
      'company_url',
      'file_names',
      'doc_paths',
      'seo_score',
      'keywords',
      'read_time',
      'word_count',
      'most_searched_query',
      'most_searched_questions',
      'top3_ranked_websites',
      'company_desc',
      'outline',
      'research_paper',
      'content_from_ai',
      'stage',
      'error',
    ]
    const sets = []
    const params = { id, updated_at: now() }
    for (const k of cols) {
      if (k in fields) {
        sets.push(`${k} = @${k}`)
        if (JSON_COLS.includes(k)) params[k] = str(fields[k])
        else if (k === 'content_from_ai') params[k] = fields[k] ? 1 : 0
        else params[k] = fields[k]
      }
    }
    if (sets.length) {
      db.prepare(`UPDATE blogs SET ${sets.join(', ')}, updated_at = @updated_at WHERE id = @id`).run(params)
    }
    return this.get(id)
  },
}
