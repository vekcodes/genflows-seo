import { useState, useRef, useEffect } from 'react'
import { FlaskConical, Loader2, Trophy, CalendarPlus, Sparkles } from 'lucide-react'
import { useCompanies } from '@/context/CompanyContext'
import { api, streamRun } from '@/lib/api'

function ScoreBar({ value, color }) {
  const pct = Math.round((value ?? 0) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-cloud">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-[11px] font-bold tabular-nums text-graphite">{value == null ? '–' : pct}</span>
    </div>
  )
}

export default function AutoresearchView() {
  const { active } = useCompanies()
  const [rounds, setRounds] = useState(3)
  const [seed, setSeed] = useState('')
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState([])
  const [runId, setRunId] = useState(null)
  const [scheduling, setScheduling] = useState(false)
  const unsubRef = useRef(null)

  useEffect(() => () => unsubRef.current?.(), [])

  if (!active)
    return <div className="py-20 text-center text-graphite">Select a company to run autoresearch.</div>

  const start = async () => {
    setRows([])
    setRunning(true)
    setStatus('Starting…')
    const { runId } = await api.startAutoresearch(active.id, { rounds: Number(rounds), seedPrompt: seed || null })
    setRunId(runId)
    unsubRef.current?.()
    unsubRef.current = streamRun(runId, (ev) => {
      if (ev.type === 'stage') setStatus(ev.label)
      else if (ev.type === 'candidate')
        setRows((r) => [...r, ev].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)))
      else if (ev.type === 'done') {
        setStatus(`Done — ${ev.winners} winners found`)
        setRunning(false)
      } else if (ev.type === 'error') {
        setStatus('Error: ' + ev.message)
        setRunning(false)
      }
    })
  }

  const schedule = async () => {
    setScheduling(true)
    try {
      const month = new Date().toISOString().slice(0, 7)
      const res = await api.scheduleAutopilot(active.id, { runId, month })
      setStatus(`Scheduled ${res.scheduled} topics onto the calendar`)
    } catch (e) {
      alert(e.message)
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="gf-sub1 text-navy">Autoresearch</h1>
        <p className="mt-1 max-w-2xl text-sm text-graphite">
          A Karpathy-style loop for <b className="text-navy">{active.name}</b>: generate candidate titles → score
          each on Google-ranking + AI-citation potential → keep winners, mutate the rest, repeat.
        </p>
      </header>

      <section className="bento-card p-6">
        <div className="flex flex-wrap items-end gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-graphite">Rounds</span>
            <input
              type="number"
              min={1}
              max={6}
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
              className="input w-24"
            />
          </label>
          <label className="flex-1 space-y-1.5">
            <span className="text-xs font-semibold text-graphite">Seed / focus (optional)</span>
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="e.g. cold email deliverability, GTM strategy…"
              className="input"
            />
          </label>
          <button
            onClick={start}
            disabled={running}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-orange px-5 text-sm font-bold text-white hover:bg-orange/90 disabled:opacity-50"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />}
            {running ? 'Running…' : 'Start run'}
          </button>
          {runId && !running && (
            <button
              onClick={schedule}
              disabled={scheduling}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-navy px-5 text-sm font-bold text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {scheduling ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
              Schedule winners
            </button>
          )}
        </div>
        {status && (
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-navy">
            <Sparkles size={15} className="text-orange" /> {status}
          </div>
        )}
      </section>

      {rows.length > 0 && (
        <section className="bento-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cloud/60 text-[10px] uppercase tracking-widest text-graphite">
              <tr>
                <th className="px-5 py-3 text-left font-bold">Candidate title</th>
                <th className="px-3 py-3 text-left font-bold">Round</th>
                <th className="px-3 py-3 text-left font-bold">Google</th>
                <th className="px-3 py-3 text-left font-bold">AI cite</th>
                <th className="px-3 py-3 text-left font-bold">Total</th>
                <th className="px-3 py-3 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-5 py-3 font-semibold text-navy">{r.title}</td>
                  <td className="px-3 py-3 text-graphite">{r.round}</td>
                  <td className="px-3 py-3"><ScoreBar value={r.google} color="bg-navy" /></td>
                  <td className="px-3 py-3"><ScoreBar value={r.ai} color="bg-orange" /></td>
                  <td className="px-3 py-3 font-bold tabular-nums text-navy">{Math.round((r.total ?? 0) * 100)}</td>
                  <td className="px-3 py-3">
                    {r.status === 'winner' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
                        <Trophy size={11} /> winner
                      </span>
                    ) : (
                      <span className="rounded-full bg-cloud px-2 py-0.5 text-[10px] font-bold uppercase text-graphite">
                        mutate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
