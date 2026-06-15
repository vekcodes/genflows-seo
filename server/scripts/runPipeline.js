// Dev CLI: run the full pipeline for one title end-to-end.
//   npm run pipeline -- "My blog title" --company "Sendr" --url https://sendr.com
import { migrate } from '../db/migrate.js'
import { Companies, Blogs } from '../db/models.js'
import { runPipeline } from '../services/pipeline/index.js'

migrate()

const args = process.argv.slice(2)
const title = args.find((a) => !a.startsWith('--')) || 'Cold Email Deliverability Checklist: How to Land in the Primary Inbox'
const getFlag = (name) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : null
}
const companyName = getFlag('company') || 'Acme'
const url = getFlag('url') || null

const company =
  Companies.list().find((c) => c.name.toLowerCase() === companyName.toLowerCase()) ||
  Companies.create({ name: companyName, url })

const blog = Blogs.create({
  company_id: company.id,
  title,
  company_name: company.name,
  company_url: company.url,
})

console.log(`\n▶ Running pipeline for "${title}" (company: ${company.name}) blog=${blog.id}\n`)

const t0 = Date.now()
let deltaChars = 0
runPipeline(blog.id, (type, data) => {
  if (type === 'stage') console.log(`  [${data.index}/${data.total}] ${data.label}`)
  else if (type === 'delta') {
    deltaChars += data.text.length
    process.stdout.write(deltaChars % 2000 < data.text.length ? '.' : '')
  } else if (type === 'done') console.log(`\n✔ done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  else if (type === 'error') console.error('\n[x] error:', data.message)
})
  .then((b) => {
    console.log('\n── result ──')
    console.log('words:', b.word_count, '| read:', b.read_time, 'min | seo_score:', b.seo_score)
    console.log('keywords:', (b.keywords || []).slice(0, 8).join(', '))
    console.log('top3:', b.top3_ranked_websites)
    console.log('\ncontent preview:\n', (b.content || '').slice(0, 600), '...')
    process.exit(0)
  })
  .catch((err) => {
    console.error('pipeline failed:', err)
    process.exit(1)
  })
