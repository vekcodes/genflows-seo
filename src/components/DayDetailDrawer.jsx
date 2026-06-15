import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Sparkles, Trash2, ArrowRight, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import GenerationProgress from './GenerationProgress'

const STATUS_STYLE = {
  planned: 'bg-cloud text-graphite',
  generating: 'bg-orange/10 text-orange',
  complete: 'bg-emerald-50 text-emerald-600',
  error: 'bg-red-50 text-red-600',
}

export default function DayDetailDrawer({ date, companyId, entries, onClose, onChanged }) {
  const [newTitle, setNewTitle] = useState('')
  const [genId, setGenId] = useState(null)

  const addManual = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await api.addEntry(companyId, { title: newTitle.trim(), scheduledDate: date })
    setNewTitle('')
    onChanged()
  }

  const generate = async (entry) => {
    const { blogId } = await api.generate(entry.id)
    setGenId(blogId)
    onChanged()
  }

  const remove = async (entry) => {
    await api.deleteEntry(entry.id)
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" />
      <aside
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-sm font-extrabold text-navy">
              {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </h2>
            <p className="text-xs text-graphite">{entries.length} scheduled</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-graphite hover:bg-cloud">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {entries.length === 0 && (
            <p className="text-sm text-graphite">No topics scheduled for this day yet.</p>
          )}

          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-navy">{entry.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[entry.status]}`}>
                  {entry.status}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {entry.status === 'complete' && entry.blog_id ? (
                  <Link
                    to={`/blog/${entry.blog_id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white hover:bg-navy/90"
                  >
                    View blog <ArrowRight size={13} />
                  </Link>
                ) : entry.status === 'generating' ? (
                  <span className="text-xs font-semibold text-orange">Generating…</span>
                ) : (
                  <button
                    onClick={() => generate(entry)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-3 py-2 text-xs font-bold text-white hover:bg-orange/90"
                  >
                    <Sparkles size={13} /> Generate blog
                  </button>
                )}
                <button
                  onClick={() => remove(entry)}
                  className="rounded-lg p-2 text-graphite hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {genId && (
            <div className="rounded-xl border p-4">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-graphite">Generation</h3>
              <GenerationProgress blogId={genId} onDone={onChanged} />
            </div>
          )}

          <form onSubmit={addManual} className="flex gap-2 pt-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a topic manually…"
              className="input"
            />
            <button type="submit" className="shrink-0 rounded-lg bg-cloud px-3 text-navy hover:bg-smoke">
              <Plus size={16} />
            </button>
          </form>
        </div>
      </aside>
    </div>
  )
}
