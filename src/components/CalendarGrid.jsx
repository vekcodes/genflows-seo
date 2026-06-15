const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DOT = {
  planned: 'bg-graphite',
  generating: 'bg-orange animate-pulse',
  complete: 'bg-emerald-500',
  error: 'bg-red-500',
}

function pad(n) {
  return String(n).padStart(2, '0')
}

export default function CalendarGrid({ month, entries, onSelectDay }) {
  const [y, m] = month.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  const byDate = {}
  for (const e of entries) (byDate[e.scheduled_date] ||= []).push(e)

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="grid grid-cols-7 border-b bg-cloud/50">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-graphite">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="min-h-28 border-b border-r bg-cloud/20" />
          const iso = `${y}-${pad(m)}-${pad(d)}`
          const dayEntries = byDate[iso] || []
          const isToday = iso === todayStr
          return (
            <button
              key={i}
              onClick={() => onSelectDay(iso)}
              className="group min-h-28 border-b border-r p-2 text-left align-top transition-colors hover:bg-cloud/40"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday ? 'bg-orange text-white' : 'text-navy'
                  }`}
                >
                  {d}
                </span>
              </div>
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-1.5 rounded-md bg-cloud/70 px-1.5 py-1 text-[11px] font-semibold text-navy"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[e.status]}`} />
                    <span className="truncate">{e.title}</span>
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <div className="px-1.5 text-[10px] font-bold text-graphite">+{dayEntries.length - 3} more</div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
