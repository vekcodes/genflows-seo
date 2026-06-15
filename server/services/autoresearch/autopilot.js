import { Entries } from '../../db/models.js'

// Cadence -> which weekdays to post on (0=Sun..6=Sat).
const CADENCE_DAYS = {
  1: [2], // Tue
  2: [2, 4], // Tue, Thu
  3: [1, 3, 5], // Mon, Wed, Fri
  4: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
  5: [1, 2, 3, 4, 5], // weekdays
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

function pad(n) {
  return String(n).padStart(2, '0')
}

/** All dates in `month` (YYYY-MM) whose weekday is in `weekdays`, on/after today. */
function candidateDates(month, weekdays) {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)
  const out = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d)
    const iso = `${y}-${pad(m)}-${pad(d)}`
    if (iso < todayStr) continue
    if (weekdays.includes(date.getDay())) out.push(iso)
  }
  return out
}

/**
 * Place winner topics onto open calendar dates for the month at the company's
 * cadence. Skips dates already occupied. Returns the created entries.
 */
export function scheduleTopics({ company, winners, month }) {
  const cadence = company.autopilot_cadence || 3
  const weekdays = CADENCE_DAYS[cadence] || CADENCE_DAYS[3]
  const dates = candidateDates(month, weekdays)
  const occupied = Entries.occupiedDates(company.id)

  const open = dates.filter((d) => !occupied.has(d))
  const created = []
  for (let i = 0; i < winners.length && i < open.length; i++) {
    const w = winners[i]
    const entry = Entries.create({
      company_id: company.id,
      topic_candidate_id: w.id,
      title: w.title,
      scheduled_date: open[i],
      source: 'autopilot',
    })
    created.push(entry)
  }
  return created
}
