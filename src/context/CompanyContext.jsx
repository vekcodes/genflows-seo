import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'

const CompanyContext = createContext(null)

const STORAGE_KEY = 'gf_active_company'

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem(STORAGE_KEY) || null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await api.listCompanies()
    setCompanies(list)
    setActiveId((cur) => {
      if (cur && list.some((c) => c.id === cur)) return cur
      return list[0]?.id || null
    })
    setLoading(false)
    return list
  }, [])

  useEffect(() => {
    refresh().catch((e) => {
      console.error('Failed to load companies', e)
      setLoading(false)
    })
  }, [refresh])

  useEffect(() => {
    if (activeId) localStorage.setItem(STORAGE_KEY, activeId)
  }, [activeId])

  const active = companies.find((c) => c.id === activeId) || null

  return (
    <CompanyContext.Provider
      value={{ companies, active, activeId, setActiveId, refresh, loading }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompanies() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompanies must be used within CompanyProvider')
  return ctx
}
