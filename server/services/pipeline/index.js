import { Blogs, Companies, Entries } from '../../db/models.js'
import { titleQueries } from './titleQueries.js'
import { googledQuestions } from './questions.js'
import { serpTop3 } from './serpTop3.js'
import { companySummary } from './companySummary.js'
import { researchPaper } from './researchPaper.js'
import { keywordDensity } from './keywordDensity.js'
import { outline as buildOutline, formatOutline } from './outline.js'
import { generateBlog } from './blog.js'
import { plagiarismPass } from './plagiarism.js'

const wordCount = (t) => (t ? t.trim().split(/\s+/).length : 0)
const readTime = (t) => Math.max(1, Math.ceil(wordCount(t) / 200))

/** Keyword-coverage heuristic (0-100) replacing the old random score. */
function seoScore(content, keywords) {
  if (!content || !keywords?.length) return 70
  const lc = content.toLowerCase()
  const covered = keywords.filter((k) => lc.includes(String(k).toLowerCase())).length
  const coverage = covered / keywords.length
  const lengthBonus = Math.min(1, wordCount(content) / 3500)
  return Math.round(60 + coverage * 30 + lengthBonus * 10)
}

const STAGES = [
  'title-queries',
  'questions',
  'serp-top3',
  'company-summary',
  'research-paper',
  'keyword-density',
  'outline',
  'blog',
  'plagiarism',
]

/**
 * Run the full pipeline for a blog row. `emit(type, data)` pushes SSE events.
 * Intermediates are persisted after every stage (resumable + accurate state).
 */
export async function runPipeline(blogId, emit = () => {}) {
  const blog = Blogs.get(blogId)
  if (!blog) throw new Error(`blog ${blogId} not found`)
  const company = blog.company_id ? Companies.get(blog.company_id) : null
  const companyName = blog.company_name || company?.name || 'the company'

  let stageIndex = 0
  const stage = (name, label) => {
    stageIndex++
    Blogs.update(blogId, { stage: name })
    emit('stage', { stage: name, label, index: stageIndex, total: STAGES.length })
  }

  // 1. title -> high-search queries
  stage('title-queries', 'Researching high-search title variants')
  const queries = await titleQueries(blog.title)
  const mostSearchedQuery = queries.map((q, i) => `${i + 1}. ${q}`).join('\n')
  Blogs.update(blogId, { most_searched_query: mostSearchedQuery })

  // 2. most-googled questions
  stage('questions', 'Mining the most-googled questions')
  const questions = await googledQuestions(blog.title)
  Blogs.update(blogId, { most_searched_questions: questions })

  // 3. SERP top-3 ranked sites
  stage('serp-top3', 'Finding the top-ranked competitors (Google)')
  const links = await serpTop3(questions)
  Blogs.update(blogId, { top3_ranked_websites: links })

  // 4. company summary
  stage('company-summary', 'Summarizing the company knowledge')
  const companyDesc = company ? await companySummary(company) : `${companyName}.`
  Blogs.update(blogId, { company_desc: companyDesc })

  // 5. research paper
  stage('research-paper', 'Writing the in-depth research paper')
  const research = await researchPaper({ title: blog.title, companyName, companyDesc, links })
  Blogs.update(blogId, { research_paper: research })

  // 6. keyword density
  stage('keyword-density', 'Extracting ranking keywords by density')
  let keywords = await keywordDensity(links)
  if (!keywords.length) keywords = queries.slice(0, 8) // fallback when SERP pages unfetchable
  Blogs.update(blogId, { keywords })

  // 7. outline
  stage('outline', 'Building the H2/H3 outline')
  const sections = await buildOutline({
    title: blog.title,
    questions,
    companyName,
    companyDesc,
    researchPaper: research,
  })
  const outlineText = formatOutline(sections)
  Blogs.update(blogId, { outline: outlineText })

  // 8. blog (streamed)
  stage('blog', 'Writing the 4000-word blog')
  let draft = await generateBlog(
    { title: blog.title, companyName, companyDesc, researchPaper: research, keywords, outlineText },
    { onDelta: (text) => emit('delta', { text }) },
  )
  Blogs.update(blogId, { content: draft, word_count: wordCount(draft), read_time: readTime(draft) })

  // 9. plagiarism / paraphrase
  stage('plagiarism', 'Polishing & de-duplicating')
  let final = await plagiarismPass({ content: draft, keywords })
  if (!final || wordCount(final) < wordCount(draft) * 0.5) final = draft // guard against truncation

  Blogs.update(blogId, {
    content: final,
    word_count: wordCount(final),
    read_time: readTime(final),
    seo_score: seoScore(final, keywords),
    content_from_ai: 1,
    stage: 'done',
    error: null,
  })

  if (blog.calendar_entry_id) Entries.update(blog.calendar_entry_id, { status: 'complete' })

  emit('done', { blogId })
  return Blogs.get(blogId)
}
