-- GenFlows SEO Content Calendar — SQLite schema
-- List/object fields are stored as JSON TEXT and (de)serialized in the model layer.

CREATE TABLE IF NOT EXISTS companies (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  url                TEXT,
  description        TEXT,            -- cached company summary (company_desc)
  doc_path           TEXT,            -- relative path under uploads (nullable)
  doc_filename       TEXT,
  autopilot_cadence  INTEGER NOT NULL DEFAULT 3,  -- posts per week
  autopilot_enabled  INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS autoresearch_runs (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'queued',  -- queued|running|done|error
  rounds       INTEGER NOT NULL DEFAULT 3,
  seed_prompt  TEXT,
  error        TEXT,
  created_at   TEXT NOT NULL,
  finished_at  TEXT
);

CREATE TABLE IF NOT EXISTS topic_candidates (
  id                 TEXT PRIMARY KEY,
  run_id             TEXT NOT NULL REFERENCES autoresearch_runs(id) ON DELETE CASCADE,
  company_id         TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  round              INTEGER NOT NULL DEFAULT 0,
  google_score       REAL,
  ai_citation_score  REAL,
  total_score        REAL,
  status             TEXT NOT NULL DEFAULT 'candidate', -- candidate|winner|mutated|killed|scheduled
  parent_id          TEXT,            -- self-FK: loser this was mutated from
  rationale          TEXT,            -- JSON: judge sub-scores
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_entries (
  id                  TEXT PRIMARY KEY,
  company_id          TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  topic_candidate_id  TEXT REFERENCES topic_candidates(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  scheduled_date      TEXT NOT NULL,  -- 'YYYY-MM-DD'
  status              TEXT NOT NULL DEFAULT 'planned', -- planned|generating|complete|error
  blog_id             TEXT,
  source              TEXT NOT NULL DEFAULT 'manual',  -- autopilot|manual
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blogs (
  id                       TEXT PRIMARY KEY,
  company_id               TEXT REFERENCES companies(id) ON DELETE SET NULL,
  calendar_entry_id        TEXT REFERENCES calendar_entries(id) ON DELETE SET NULL,
  title                    TEXT NOT NULL,
  project                  TEXT,
  content                  TEXT,
  company_name             TEXT,
  company_url              TEXT,
  file_names               TEXT,      -- JSON array
  doc_paths                TEXT,      -- JSON array
  seo_score                INTEGER,
  keywords                 TEXT,      -- JSON array
  read_time                INTEGER,
  word_count               INTEGER,
  most_searched_query      TEXT,
  most_searched_questions  TEXT,      -- JSON array
  top3_ranked_websites     TEXT,      -- JSON array
  company_desc             TEXT,
  outline                  TEXT,
  research_paper           TEXT,
  content_from_ai          INTEGER NOT NULL DEFAULT 0,  -- 0/1
  stage                    TEXT,      -- current pipeline stage label
  error                    TEXT,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_candidates_run    ON topic_candidates(run_id);
CREATE INDEX IF NOT EXISTS idx_runs_company      ON autoresearch_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_entries_company   ON calendar_entries(company_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_blogs_company     ON blogs(company_id);
