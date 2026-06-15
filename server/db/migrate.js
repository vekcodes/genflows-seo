import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './connection.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let done = false

export function migrate() {
  if (done) return
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  db.exec(schema)
  done = true
}
