import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Zap, Loader2 } from 'lucide-react'
import { useCompanies } from '@/context/CompanyContext'
import { api } from '@/lib/api'
import CalendarGrid from '@/components/CalendarGrid'
import DayDetailDrawer from '@/components/DayDetailDrawer'

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}
function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function CalendarView() {
  const { active } = useCompanies()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [entries, setEntries] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [scheduling, setScheduling] = useState(false)

  const load = useCallback(async () => {
    if (!active) return
    const data = await api.getCalendar(active.id, month)
    setEntries(data.entries)
  }, [active, month])

  useEffect(() => {
    load()
  }, [load])

  const autopilot = async () => {
    setScheduling(true)
    try {
      const res = await api.scheduleAutopilot(active.id, { month })
      await load()
      if (res.scheduled === 0) alert('No open slots, or no completed autoresearch run yet.')
    } catch (e) {
      alert(e.message)
    } finally {
      setScheduling(false)
    }
  }

  if (!active)
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="gf-sub1 text-navy">Content Calendar</h1>
        <p className="mt-2 max-w-sm text-sm text-graphite">
          Create a company in the top bar to start scheduling SEO content.
        </p>
      </div>
    )

  const dayEntries = selectedDay ? entries.filter((e) => e.scheduled_date === selectedDay) : []

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="gf-sub1 text-navy">Content Calendar</h1>
          <p className="mt-1 text-sm text-graphite">{active.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
            <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="rounded-md p-1.5 hover:bg-cloud">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-36 text-center text-sm font-bold text-navy">{monthLabel(month)}</span>
            <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="rounded-md p-1.5 hover:bg-cloud">
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            onClick={autopilot}
            disabled={scheduling}
            className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-orange/90 disabled:opacity-50"
          >
            {scheduling ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Autopilot fill
          </button>
        </div>
      </header>

      <CalendarGrid month={month} entries={entries} onSelectDay={setSelectedDay} />

      {selectedDay && (
        <DayDetailDrawer
          date={selectedDay}
          companyId={active.id}
          entries={dayEntries}
          onClose={() => setSelectedDay(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}
