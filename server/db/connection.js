import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../env.js'

// Ensure the data directory exists.
fs.mkdirSync(path.dirname(env.databasePath), { recursive: true })

export const db = new Database(env.databasePath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
