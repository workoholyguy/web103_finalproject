import { useId, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, ClipboardList, NotebookPen, UploadCloud } from 'lucide-react'

import { createApplication, type JobApplication } from '../lib/api'
import { POPULAR_US_CITIES, US_STATES } from '../lib/locations'

type ApplicationComposerProps = {
  onCreated?: (application: JobApplication) => void
}

export function ApplicationComposer({ onCreated }: ApplicationComposerProps) {
  const [manualMessage, setManualMessage] = useState<string | null>(null)
  const [manualStatus, setManualStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [cityQuery, setCityQuery] = useState('')
  const [stateSelection, setStateSelection] = useState('')

  const cityDatalistId = useId()

  const filteredCitySuggestions = useMemo(() => {
    const normalizedQuery = cityQuery.trim().toLowerCase()
    return POPULAR_US_CITIES.filter((entry) => {
      const matchesCity = !normalizedQuery || entry.city.toLowerCase().includes(normalizedQuery)
      const matchesState = !stateSelection || entry.state === stateSelection
      return matchesCity && matchesState
    }).slice(0, 12)
  }, [cityQuery, stateSelection])

  const manualMessageClasses =
    manualStatus === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : manualStatus === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-900/5 text-slate-600'

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const formData = new FormData(formElement)
    const title = String(formData.get('title') ?? '').trim()
    const company = String(formData.get('company') ?? '').trim()
    const status = (formData.get('status') as string) ?? 'planned'
    const appliedAtRaw = String(formData.get('appliedAt') ?? '').trim()
    const jobPostUrl = String(formData.get('url') ?? '').trim()
    const notes = String(formData.get('notes') ?? '').trim()
    const sourceInput = String(formData.get('source') ?? '').trim()
    const city = String(formData.get('city') ?? '').trim()
    const stateCode = String(formData.get('state') ?? '').trim().toUpperCase()

    const location =
      city && stateCode ? `${city}, ${stateCode}` : city || stateCode || ''

    setManualStatus('loading')
    setManualMessage('Saving your application…')

    try {
      const payload = {
        title,
        company,
        status,
        appliedAt: appliedAtRaw ? new Date(`${appliedAtRaw}T00:00:00Z`).toISOString() : undefined,
        jobPostUrl: jobPostUrl || undefined,
        notes: notes || undefined,
        location: location || undefined,
        source: sourceInput || 'manual',
      }

      const created = await createApplication(payload)
      formElement.reset()
      setCityQuery('')
      setStateSelection('')
      setManualStatus('success')
      setManualMessage('Application added to your tracker.')
      onCreated?.(created)
    } catch (error) {
      setManualStatus('error')
      setManualMessage(
        error instanceof Error ? error.message : 'Unable to save the application right now.',
      )
    }
  }

  const handleImportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setImportMessage('Import ready — connect to your Job Feed selection logic next sprint.')
    event.currentTarget.reset()
  }

  return (
    <section className="space-y-10 rounded-[32px] border border-slate-100 bg-white/90 p-8 shadow-2xl shadow-slate-200/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Create or import</p>
          <h3 className="mt-2 text-3xl font-black text-slate-900">Build trackers two ways</h3>
          <p className="mt-2 text-sm text-slate-600">
            Start from scratch or pull roles directly from the Job Feed experience so every outreach
            lives inside your Job Ledger pipeline.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleManualSubmit}
          className="rounded-[28px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 text-slate-900">
            <NotebookPen size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Manual creation</p>
              <h4 className="text-xl font-semibold">Log a new opportunity</h4>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Company
                <input
                  required
                  name="company"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                Role title
                <input
                  required
                  name="title"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Status
                <select
                  name="status"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
                >
                  <option value="planned">Planned</option>
                  <option value="applied">Applied</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offer">Offer</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>

            <label className="text-sm font-semibold text-slate-600">
              Applied date
              <div className="relative mt-1">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  name="appliedAt"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm outline-none focus:border-sky-400"
                />
              </div>
            </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                City (optional)
                <input
                  name="city"
                  value={cityQuery}
                  onChange={(event) => setCityQuery(event.target.value)}
                  list={cityDatalistId}
                  placeholder="Start typing to search…"
                  autoComplete="address-level2"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
                />
                <datalist id={cityDatalistId}>
                  {filteredCitySuggestions.map((entry) => (
                    <option key={`${entry.city}-${entry.state}`} value={entry.city}>
                      {entry.city}, {entry.state}
                    </option>
                  ))}
                </datalist>
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  Suggestions narrow as you type (try “Austin”, “New York”…)
                </span>
              </label>
              <label className="text-sm font-semibold text-slate-600">
                State (optional)
                <select
                  name="state"
                  value={stateSelection}
                  onChange={(event) => setStateSelection(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
                >
                  <option value="">Choose state/territory</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-600">
                Source
                <input
                  name="source"
                  defaultValue="Manual"
                  placeholder="Manual"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                Job link
                <input
                  type="url"
                  name="url"
                  placeholder="https://company.com/careers/123"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
                />
              </label>
            </div>

            <label className="text-sm font-semibold text-slate-600">
              Notes
              <textarea
                name="notes"
                rows={3}
                placeholder="Why you love this role, recruiter contact, follow-up plan…"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400"
              />
            </label>
          </div>

          {manualMessage ? (
            <p
              className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold ${manualMessageClasses}`}
            >
              {manualMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={manualStatus === 'loading'}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            {manualStatus === 'loading' ? 'Saving…' : 'Add application'}
          </button>
        </form>

        <form
          onSubmit={handleImportSubmit}
          className="rounded-[28px] border border-slate-100 bg-white/80 p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 text-slate-900">
            <UploadCloud size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Import from feed</p>
              <h4 className="text-xl font-semibold">Capture tracked searches</h4>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="text-sm font-semibold text-slate-600">
              Job feed URL or ID
              <input
                required
                name="listing"
                placeholder="Paste role URL or cached ID"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
              />
            </label>

            <label className="text-sm font-semibold text-slate-600">
              Source
              <select
                name="source"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
              >
                <option value="usajobs">USAJOBS</option>
                <option value="adzuna">Adzuna</option>
                <option value="remotive">Remotive</option>
                <option value="lever">Lever</option>
                <option value="greenhouse">Greenhouse</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-600">
              Reminder
              <div className="relative mt-1">
                <ClipboardList
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="reminder"
                  placeholder="Follow-up in 3 days"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm outline-none focus:border-sky-400"
                />
              </div>
            </label>
          </div>

          {importMessage ? (
            <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-700">
              {importMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Stage import
          </button>
        </form>
      </div>
    </section>
  )
}
