import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Check, Building2 } from 'lucide-react'
import { useCompanies } from '@/context/CompanyContext'
import { api } from '@/lib/api'

export default function CompanySwitcher() {
  const { companies, active, setActiveId, refresh } = useCompanies()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const create = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const c = await api.createCompany({ name: name.trim(), url: url.trim() || null })
    await refresh()
    setActiveId(c.id)
    setName('')
    setUrl('')
    setCreating(false)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-cloud/50 transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-orange/10 text-orange">
          <Building2 size={15} />
        </span>
        <span className="max-w-[200px] truncate">{active ? active.name : 'No company'}</span>
        <ChevronDown size={15} className="text-graphite" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border bg-white p-1.5 shadow-xl">
          <div className="max-h-64 overflow-y-auto">
            {companies.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-graphite">No companies yet</div>
            )}
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveId(c.id)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold hover:bg-cloud/60"
              >
                <span className="truncate">{c.name}</span>
                {active?.id === c.id && <Check size={15} className="text-orange" />}
              </button>
            ))}
          </div>

          <div className="mt-1.5 border-t pt-1.5">
            {creating ? (
              <form onSubmit={create} className="space-y-2 p-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Company name"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-orange"
                />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://website.com (optional)"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-orange"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded-lg bg-orange py-2 text-xs font-bold text-white hover:bg-orange/90">
                    Create
                  </button>
                  <button type="button" onClick={() => setCreating(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-graphite hover:bg-cloud">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-orange hover:bg-orange/5"
              >
                <Plus size={16} />
                New company
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
