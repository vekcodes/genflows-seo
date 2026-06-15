import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Building2, FlaskConical } from 'lucide-react'
import CompanySwitcher from './components/CompanySwitcher'

const navItems = [
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/autoresearch', label: 'Autoresearch', icon: FlaskConical },
]

export default function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-cloud/40">
      {/* Sidebar (navy — GenFlows secondary surface) */}
      <aside className="flex w-60 shrink-0 flex-col bg-navy text-white">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <img src="/genflows_agency_logo.jpg" alt="GenFlows" className="h-8 w-8 rounded-md object-contain bg-white/5" />
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">GenFlows</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">SEO Engine</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? 'bg-orange text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 text-[10px] leading-relaxed text-white/40">
          Glass Box content engine — visible, engineered, ownable growth.
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-white px-6">
          <CompanySwitcher />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
