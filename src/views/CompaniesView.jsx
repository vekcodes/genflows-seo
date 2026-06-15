import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link } from 'react-router-dom'
import { UploadCloud, FileText, Trash2, Save, Loader2, FlaskConical, Check } from 'lucide-react'
import { useCompanies } from '@/context/CompanyContext'
import { api } from '@/lib/api'

const CADENCE_LABEL = { 1: '1×/week', 2: '2×/week', 3: '3×/week', 4: '4×/week', 5: 'Weekdays' }

export default function CompaniesView() {
  const { active, refresh } = useCompanies()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(active ? { ...active } : null)
  }, [active])

  const onDrop = useCallback(
    async (files) => {
      if (!active || !files[0]) return
      setUploading(true)
      try {
        const updated = await api.uploadDoc(active.id, files[0])
        setForm((f) => ({ ...f, ...updated }))
        await refresh()
      } catch (e) {
        alert('Upload failed: ' + e.message)
      } finally {
        setUploading(false)
      }
    },
    [active, refresh],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    disabled: !active || uploading,
  })

  if (!active)
    return (
      <Empty />
    )

  const save = async () => {
    setSaving(true)
    try {
      await api.updateCompany(active.id, {
        name: form.name,
        url: form.url,
        description: form.description,
        autopilot_cadence: Number(form.autopilot_cadence),
        autopilot_enabled: form.autopilot_enabled ? 1 : 0,
      })
      await refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirm(`Delete "${active.name}" and all its data?`)) return
    await api.deleteCompany(active.id)
    await refresh()
  }

  if (!form) return null

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="gf-sub1 text-navy">{active.name}</h1>
          <p className="mt-1 text-sm text-graphite">Company profile & autopilot settings</p>
        </div>
        <Link
          to="/autoresearch"
          className="inline-flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-bold text-white hover:bg-orange/90"
        >
          <FlaskConical size={16} /> Run Autoresearch
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <section className="bento-card p-6 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-graphite">Profile</h2>
          <Field label="Name">
            <input
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Website URL">
            <input
              value={form.url || ''}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
              className="input"
            />
          </Field>
          <Field label="Company summary (used by the AI pipeline)">
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              placeholder="Auto-filled when you upload a doc — or write it yourself."
              className="input resize-none"
            />
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy/90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
              {saved ? 'Saved' : 'Save'}
            </button>
            <button onClick={del} className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/5">
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </section>

        {/* Knowledge + autopilot */}
        <div className="space-y-6">
          <section className="bento-card p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-graphite">Knowledge source</h2>
            <div
              {...getRootProps()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragActive ? 'border-orange bg-orange/5' : 'border-smoke hover:border-orange/50'
              }`}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <Loader2 className="animate-spin text-orange" />
              ) : (
                <UploadCloud className="text-graphite" />
              )}
              <p className="text-sm font-semibold text-navy">
                {uploading ? 'Extracting & summarizing…' : 'Drop a PDF/TXT, or click to upload'}
              </p>
              <p className="text-xs text-graphite">We extract the text and summarize it for the pipeline.</p>
            </div>
            {form.doc_filename && (
              <div className="flex items-center gap-2 rounded-lg bg-cloud/60 px-3 py-2 text-sm font-semibold text-navy">
                <FileText size={15} className="text-orange" /> {form.doc_filename}
              </div>
            )}
          </section>

          <section className="bento-card p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-graphite">Autopilot</h2>
            <Field label="Publishing cadence">
              <select
                value={form.autopilot_cadence || 3}
                onChange={(e) => setForm({ ...form, autopilot_cadence: e.target.value })}
                className="input"
              >
                {Object.entries(CADENCE_LABEL).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-3 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={!!form.autopilot_enabled}
                onChange={(e) => setForm({ ...form, autopilot_enabled: e.target.checked })}
                className="h-4 w-4 accent-orange"
              />
              Enable autopilot scheduling
            </label>
          </section>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-graphite">{label}</span>
      {children}
    </label>
  )
}

function Empty() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="gf-sub1 text-navy">No company selected</h1>
      <p className="mt-2 max-w-sm text-sm text-graphite">
        Use the company switcher in the top bar to create your first brand, then upload its knowledge
        doc and run autoresearch.
      </p>
    </div>
  )
}
