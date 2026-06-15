import { askStructured } from '../anthropic.js'

const SCHEMA = {
  most_searched_query1: '',
  most_searched_query2: '',
  most_searched_query3: '',
  most_searched_query4: '',
  most_searched_query5: '',
  most_searched_query6: '',
  most_searched_query7: '',
  most_searched_query8: '',
  most_searched_query9: '',
  most_searched_query10: '',
}

/** n8n "MS": better/high-search title variants for a topic. Returns string[10]. */
export async function titleQueries(title) {
  const prompt = `Take this blog topic/title: "${title}". Produce 10 better, high-search-volume title variations that real people search on Google. Each should be a strong, clickable, SEO-optimized title.`
  const out = await askStructured(prompt, SCHEMA)
  return Object.keys(SCHEMA)
    .map((k) => out[k])
    .filter((v) => v && String(v).trim())
}
