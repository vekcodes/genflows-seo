import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import BlogOutput from '@/components/BlogOutput'

export default function BlogView() {
  const { blogId } = useParams()
  const [blog, setBlog] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let on = true
    api
      .getBlog(blogId)
      .then((b) => on && setBlog(b))
      .catch((e) => on && setError(e.message))
    return () => {
      on = false
    }
  }, [blogId])

  return (
    <div className="space-y-6">
      <Link to="/calendar" className="inline-flex items-center gap-2 text-sm font-bold text-graphite hover:text-navy">
        <ArrowLeft size={16} /> Back to calendar
      </Link>
      {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>}
      {!blog && !error && (
        <div className="flex items-center gap-2 py-20 text-graphite">
          <Loader2 className="animate-spin" /> Loading…
        </div>
      )}
      {blog && <BlogOutput blog={blog} />}
    </div>
  )
}
