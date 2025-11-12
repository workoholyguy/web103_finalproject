import { useEffect, useMemo, useState } from 'react'
import { Filter, Loader2, Search } from 'lucide-react'

import { fetchApplications, type JobApplication } from '../lib/api'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

const DATE_RANGE_OPTIONS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'any', label: 'Any time' },
]

const statusColors: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  applied: 'bg-blue-100 text-blue-700',
  interviewing: 'bg-amber-100 text-amber-800',
  offer: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-700',
}

const limit = 15

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

export function ApplicationsBoard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('90')
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchTerm), 350)
    return () => window.clearTimeout(handle)
  }, [searchTerm])

  const appliedAfter = useMemo(() => {
    if (dateRange === 'any') return undefined
    const days = Number(dateRange)
    if (!Number.isFinite(days) || days <= 0) return undefined
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString()
  }, [dateRange])

  const summary = useMemo(() => {
    return applications.reduce<Record<string, number>>((acc, app) => {
      acc[app.status] = (acc[app.status] ?? 0) + 1
      return acc
    }, {})
  }, [applications])

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setDateRange('90')
  }

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { items, meta } = await fetchApplications({
          query: debouncedSearch,
          status: statusFilter === 'all' ? undefined : statusFilter,
          appliedAfter,
          limit,
        })

        if (cancelled) return
        setApplications(items)
        setMeta(meta ?? { page: 1, limit, total: items.length })
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load applications')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [appliedAfter, debouncedSearch, statusFilter])

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-cyan-700">Application tracker</p>
          <h2 className="text-3xl font-black text-gray-900">Search & filter your saved roles</h2>
          <p className="text-gray-500 max-w-3xl">
            Combine keyword search with status and timeframe filters to focus on the most relevant
            opportunities in your pipeline.
          </p>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500">
            <Search size={18} className="text-gray-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by company or role title"
              className="bg-transparent text-sm flex-1 outline-none"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500">
            <Filter size={18} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500">
            <span className="text-sm font-medium text-gray-500">Applied</span>
            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:border-gray-300"
            disabled={
              !searchTerm && statusFilter === 'all' && dateRange === '90'
            }
          >
            Reset
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
            <Loader2 className="animate-spin" size={32} />
            <p>Loading your applications…</p>
          </div>
        ) : applications.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
              <p>
                Showing <span className="font-semibold text-gray-900">{applications.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{meta?.total ?? applications.length}</span>{' '}
                applications
              </p>
              <div className="flex flex-wrap gap-3">
                {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                  <span key={option.value} className="text-xs uppercase tracking-wide text-gray-400">
                    {option.label}:{' '}
                    <span className="text-gray-700 font-semibold">
                      {summary[option.value] ?? 0}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Company</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Applied</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{application.title}</p>
                        <p className="text-xs text-gray-500">{application.location ?? 'Location TBD'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{application.company}</p>
                        <p className="text-xs text-gray-500">{application.stage ?? 'No stage'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            statusColors[application.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {application.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{formatDate(application.appliedAt)}</p>
                        <p className="text-xs text-gray-500">
                          {application.responseAt ? `Response: ${formatDate(application.responseAt)}` : 'Waiting'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{application.source ?? 'Manual'}</p>
                        <p className="text-xs text-gray-500">
                          {application.remote ? 'Remote' : 'On-site / Hybrid'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {application.jobPostUrl ? (
                          <a
                            href={application.jobPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-cyan-700 hover:text-cyan-900"
                          >
                            View ↗
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">No link</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center text-gray-500">
            No applications match those filters. Try widening your search or resetting filters.
          </div>
        )}
      </div>
    </section>
  )
}
