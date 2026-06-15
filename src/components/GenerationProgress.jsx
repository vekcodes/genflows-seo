import { useState, useEffect, useRef } from 'react'
import { streamBlog } from '@/lib/api'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function GenerationProgress({ blogId, onDone }) {
  const [stages, setStages] = useState([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState('')
  const unsubRef = useRef(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    setStages([])
    setDone(false)
    setError(null)
    setPreview('')
    unsubRef.current = streamBlog(blogId, (ev) => {
      if (ev.type === 'stage') setStages((s) => [...s, ev])
      else if (ev.type === 'delta') setPreview((p) => (p + ev.text).slice(-1200))
      else if (ev.type === 'done') {
        setDone(true)
        onDoneRef.current?.(blogId)
      } else if (ev.type === 'error') setError(ev.message)
    })
    return () => unsubRef.current?.()
  }, [blogId])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-navy p-4 font-mono text-xs text-white/90">
        <div className="mb-2 flex items-center gap-2 text-white/50">
          <span className="h-2 w-2 rounded-full bg-orange" /> live pipeline
        </div>
        <div className="space-y-1.5">
          {stages.map((s, i) => {
            const last = i === stages.length - 1 && !done && !error
            return (
              <div key={i} className="flex items-center gap-2">
                {last ? (
                  <Loader2 size={13} className="animate-spin text-orange" />
                ) : (
                  <CheckCircle2 size={13} className="text-emerald-400" />
                )}
                <span className="text-white/60">[{s.index}/{s.total}]</span>
                <span>{s.label}</span>
              </div>
            )
          })}
          {done && (
            <div className="flex items-center gap-2 pt-1 text-emerald-400">
              <CheckCircle2 size={13} /> Complete
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 pt-1 text-red-400">
              <AlertTriangle size={13} /> {error}
            </div>
          )}
        </div>
      </div>

      {preview && !done && (
        <div className="rounded-xl border bg-cloud/40 p-4 text-xs leading-relaxed text-graphite">
          <span className="opacity-60">…{preview}</span>
          <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-orange align-middle" />
        </div>
      )}
    </div>
  )
}
