import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, Filter, Layers3, Loader2, Pencil, Search, SortAsc, Trash2 } from 'lucide-react'

import {
  deleteApplication,
  fetchApplications,
  isSandboxEnabled,
  updateApplication,
  updateApplicationStatus,
  type JobApplication,
} from '../lib/api'
import type { ApplicationsResponse } from '../lib/types'

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

const SORTING_OPTIONS = [
  { value: 'applied_desc', label: 'Applied date (newest)' },
  { value: 'applied_asc', label: 'Applied date (oldest)' },
  { value: 'created_desc', label: 'Recently added' },
  { value: 'created_asc', label: 'First saved' },
  { value: 'company_asc', label: 'Company A → Z' },
  { value: 'title_asc', label: 'Role A → Z' },
]

const statusColors: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  applied: 'bg-blue-100 text-blue-700',
  interviewing: 'bg-amber-100 text-amber-800',
  offer: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-700',
}

const limit = 20

type RemotePreference = 'remote' | 'onsite' | 'unknown'

type EditFormState = {
  title: string
  company: string
  status: JobApplication['status']
  appliedAt: string
  jobPostUrl: string
  source: string
  location: string
  remote: RemotePreference
  notes: string
}

const buildEditFormState = (application: JobApplication | null): EditFormState => ({
  title: application?.title ?? '',
  company: application?.company ?? '',
  status: application?.status ?? 'planned',
  appliedAt: application?.appliedAt
    ? application.appliedAt.split('T')[0] ?? ''
    : '',
  jobPostUrl: application?.jobPostUrl ?? '',
  source: application?.source ?? '',
  location: application?.location ?? '',
  remote:
    application?.remote === true
      ? 'remote'
      : application?.remote === false
        ? 'onsite'
        : 'unknown',
  notes: application?.notes ?? '',
})

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

export function ApplicationsBoard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('90')
  const [sortOption, setSortOption] = useState('applied_desc')
  const [page, setPage] = useState(1)
  const [groupByCompany, setGroupByCompany] = useState(false)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [meta, setMeta] = useState<ApplicationsResponse['meta'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>(() => buildEditFormState(null))
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const sandboxMode = isSandboxEnabled()
  const readOnlyMode = Boolean(meta?.readOnly) && !sandboxMode
  const canManageApplications = sandboxMode || !readOnlyMode

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

  const groupedApplications = useMemo(() => {
    if (!groupByCompany) return []
    const map = new Map<string, JobApplication[]>()
    for (const application of applications) {
      const key = application.company || 'Unknown company'
      const existing = map.get(key) ?? []
      existing.push(application)
      map.set(key, existing)
    }
    return Array.from(map.entries())
      .map(([company, roles]) => ({
        company,
        applications: roles,
      }))
      .sort((a, b) => a.company.localeCompare(b.company))
  }, [applications, groupByCompany])

  const currentPage = meta?.page ?? page
  const pageLimit = meta?.limit ?? limit
  const totalApplications = meta?.total ?? applications.length
  const totalPages = Math.max(1, Math.ceil(totalApplications / (pageLimit || 1)))
  const startItem = applications.length ? (currentPage - 1) * pageLimit + 1 : 0
  const endItem = applications.length ? startItem + applications.length - 1 : 0

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setDateRange('90')
    setSortOption('applied_desc')
    setGroupByCompany(false)
    setPage(1)
  }

  useEffect(() => {
    if (editingApplication) {
      setEditForm(buildEditFormState(editingApplication))
    } else {
      setEditForm(buildEditFormState(null))
    }
    setEditError(null)
  }, [editingApplication])

  useEffect(() => {
    if (readOnlyMode) {
      setEditingApplication(null)
    }
  }, [readOnlyMode])

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
          sort: sortOption,
          page,
        })

        if (cancelled) return
        setApplications(items)
        setMeta(
          meta ?? {
            page,
            limit,
            total: items.length,
            readOnly: false,
          },
        )
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
  }, [appliedAfter, debouncedSearch, statusFilter, sortOption, refreshKey, page])

  useEffect(() => {
    const latestTotalPages = Math.max(
      1,
      Math.ceil((meta?.total ?? applications.length) / ((meta?.limit ?? limit) || 1)),
    )
    if (page > latestTotalPages) {
      setPage(latestTotalPages)
    }
  }, [applications.length, meta, page])

  const handleEditFieldChange = <K extends keyof EditFormState>(
    field: K,
    value: EditFormState[K],
  ) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const closeEditor = () => {
    if (savingEdit) return
    setEditingApplication(null)
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingApplication) return
    if (!canManageApplications) {
      setEditError('Sign in to manage your applications.')
      return
    }
    setSavingEdit(true)
    setEditError(null)
    const title = editForm.title.trim()
    const company = editForm.company.trim()
    if (!title || !company) {
      setEditError('Company and role title are required.')
      setSavingEdit(false)
      return
    }
    try {
      const payload = {
        title,
        company,
        status: editForm.status,
        appliedAt: editForm.appliedAt
          ? new Date(`${editForm.appliedAt}T00:00:00Z`).toISOString()
          : undefined,
        jobPostUrl: editForm.jobPostUrl.trim() || undefined,
        source: editForm.source.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
        location: editForm.location.trim() || undefined,
        remote:
          editForm.remote === 'remote'
            ? true
            : editForm.remote === 'onsite'
              ? false
              : undefined,
      }

      const updated = await updateApplication(editingApplication.id, payload)
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)))
      setEditingApplication(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unable to save changes right now.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteApplication = async (application: JobApplication) => {
    if (!canManageApplications) {
      setActionError('Sign in to manage your applications.')
      return
    }
    const confirmed = window.confirm(
      `Delete your application for ${application.company}? This can't be undone.`,
    )
    if (!confirmed) return

    setActionError(null)
    setDeletingId(application.id)
    try {
      await deleteApplication(application.id)
      setApplications((prev) => prev.filter((app) => app.id !== application.id))
      if (editingApplication?.id === application.id) {
        setEditingApplication(null)
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to delete application right now.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    if (!id) return
    if (!canManageApplications) {
      setActionError('Sign in to manage your applications.')
      return
    }
    setUpdatingId(id)
    setActionError(null)
    try {
      const updated = await updateApplicationStatus(id, status as JobApplication['status'])
      setApplications((prev) => prev.map((app) => (app.id === id ? updated : app)))
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update that application right now.',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const goToPage = (targetPage: number) => {
    const nextPage = Math.max(1, Math.min(targetPage, totalPages))
    setPage(nextPage)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToPreviousPage = () => {
    if (currentPage <= 1) return
    goToPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage >= totalPages) return
    goToPage(currentPage + 1)
  }

  return (
    <>
      <section className="bg-white py-10 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 space-y-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-cyan-700">Application tracker</p>
          <h2 className="text-3xl font-black text-gray-900">Search & filter your saved roles</h2>
          <p className="text-gray-500 max-w-3xl">
            Combine keyword search with status and timeframe filters to focus on the most relevant
            opportunities in your pipeline.
          </p>
        </header>

        {sandboxMode ? (
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 shadow-sm">
            Demo mode: everything you add or edit here is stored locally in your browser so every visitor
            gets their own sandboxed pipeline. Sign in later to sync with the real API.
          </div>
        ) : null}
        {readOnlyMode ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            You&apos;re viewing a read-only preview because you aren&apos;t signed in. Sign in to manage your own
            applications.
          </div>
        ) : null}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500">
            <Search size={18} className="text-gray-500" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
              placeholder="Search by company or role title"
              className="bg-transparent text-sm flex-1 outline-none"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500">
            <Filter size={18} className="text-gray-500" />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
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
              onChange={(event) => {
                setDateRange(event.target.value)
                setPage(1)
              }}
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
            className="w-full max-w-[220px] rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:border-gray-300 sm:w-auto"
            disabled={!searchTerm && statusFilter === 'all' && dateRange === '90'}
            aria-disabled={!searchTerm && statusFilter === 'all' && dateRange === '90'}
          >
            Reset
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 focus-within:border-cyan-500">
            <SortAsc size={18} className="text-gray-500" />
            <select
              value={sortOption}
              onChange={(event) => {
                setSortOption(event.target.value)
                setPage(1)
              }}
              className="bg-transparent text-sm outline-none"
            >
              {SORTING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setGroupByCompany((value) => !value)}
            aria-pressed={groupByCompany}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              groupByCompany
                ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Layers3 size={16} />
            {groupByCompany ? 'Grouped by company' : 'Group by company'}
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {actionError}
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
            <Loader2 className="animate-spin" size={32} />
            <p>Loading your applications…</p>
          </div>
        ) : applications.length ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p>
                Showing{' '}
                {applications.length ? (
                  <>
                    <span className="font-semibold text-gray-900">{startItem}</span>
                    {'–'}
                    <span className="font-semibold text-gray-900">{endItem}</span>
                  </>
                ) : (
                  <span className="font-semibold text-gray-900">0</span>
                )}{' '}
                of{' '}
                <span className="font-semibold text-gray-900">
                  {totalApplications}
                </span>{' '}
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

            {groupByCompany ? (
              <div className="space-y-4">
                {groupedApplications.map((group) => (
                  <div
                    key={group.company}
                    className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{group.company}</p>
                        <p className="text-sm text-gray-500">
                          {group.applications.length}{' '}
                          {group.applications.length === 1 ? 'role saved' : 'roles saved'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {group.applications.map((application) => (
                        <div
                          key={application.id}
                          className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900">{application.title}</p>
                            <p className="text-xs text-gray-500">
                              {application.location ?? 'Location TBD'} •{' '}
                              <span className="capitalize">{application.status}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 text-right">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                              <select
                                value={application.status}
                                disabled={!canManageApplications || updatingId === application.id}
                                onChange={(event) =>
                                  handleStatusChange(application.id, event.target.value)
                                }
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                  statusColors[application.status] ?? 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {STATUS_OPTIONS.filter((option) => option.value !== 'all').map(
                                  (option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                            <div className="flex items-center gap-2">
                              {application.jobPostUrl ? (
                                <a
                                  href={application.jobPostUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-cyan-200 hover:text-cyan-700"
                                  aria-label="Open job posting"
                                  title="Open job posting"
                                >
                                  <Eye size={16} />
                                </a>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center rounded-full border border-gray-100 bg-gray-50 p-2 text-gray-300"
                                  title="No job link available"
                                >
                                  <Eye size={16} />
                                  <span className="sr-only">No job link available</span>
                                </span>
                              )}
                              {canManageApplications ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingApplication(application)}
                                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-cyan-200 hover:text-cyan-700"
                                    title="Edit application"
                                    aria-label="Edit application"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteApplication(application)}
                                    disabled={deletingId === application.id}
                                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Delete application"
                                    aria-label="Delete application"
                                  >
                                    {deletingId === application.id ? (
                                      <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                </>
                              ) : (
                                <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                  Read only
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-3xl border border-gray-100 shadow-sm lg:block">
                  <table className="w-full min-w-[680px] text-sm">
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
                          </td>
                          <td className="px-6 py-4">
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                              <select
                                value={application.status}
                                disabled={!canManageApplications || updatingId === application.id}
                                onChange={(event) =>
                                  handleStatusChange(application.id, event.target.value)
                                }
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                  statusColors[application.status] ?? 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {STATUS_OPTIONS.filter((option) => option.value !== 'all').map(
                                  (option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ),
                                )}
                              </select>
                            </label>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{formatDate(application.appliedAt)}</p>
                            <p className="text-xs text-gray-500">
                              {application.responseAt
                                ? `Response: ${formatDate(application.responseAt)}`
                                : 'Waiting'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{application.source ?? 'Manual'}</p>
                            <p className="text-xs text-gray-500">
                              {application.remote ? 'Remote' : 'On-site / Hybrid'}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {application.jobPostUrl ? (
                                <a
                                  href={application.jobPostUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-cyan-200 hover:text-cyan-700"
                                  aria-label="Open job posting"
                                  title="Open job posting"
                                >
                                  <Eye size={16} />
                                </a>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center rounded-full border border-gray-100 bg-gray-50 p-2 text-gray-300"
                                  title="No job link available"
                                >
                                  <Eye size={16} />
                                  <span className="sr-only">No job link available</span>
                                </span>
                              )}
                              {canManageApplications ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setEditingApplication(application)}
                                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-cyan-200 hover:text-cyan-700"
                                    title="Edit application"
                                    aria-label="Edit application"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteApplication(application)}
                                    disabled={deletingId === application.id}
                                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Delete application"
                                    aria-label="Delete application"
                                  >
                                    {deletingId === application.id ? (
                                      <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                </>
                              ) : (
                                <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                  Read only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-4 lg:hidden">
                  {applications.map((application) => (
                    <article
                      key={application.id}
                      className="rounded-3xl border border-gray-100 bg-white/90 p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{application.company}</p>
                          <p className="text-base font-black text-gray-900">{application.title}</p>
                          <p className="text-xs text-gray-500">
                            {application.location ?? 'Location TBD'}
                          </p>
                        </div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          <select
                            value={application.status}
                            disabled={!canManageApplications || updatingId === application.id}
                            onChange={(event) => handleStatusChange(application.id, event.target.value)}
                            className={`mt-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                              statusColors[application.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500">
                        <div>
                          <p className="font-semibold text-gray-900">Applied</p>
                          <p>{formatDate(application.appliedAt)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Response</p>
                          <p>{application.responseAt ? formatDate(application.responseAt) : 'Waiting'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Source</p>
                          <p>{application.source ?? 'Manual'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Mode</p>
                          <p>{application.remote ? 'Remote' : 'On-site / Hybrid'}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {application.jobPostUrl ? (
                          <a
                            href={application.jobPostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-cyan-200 hover:text-cyan-700"
                          >
                            <Eye size={14} /> View role
                          </a>
                        ) : (
                          <span className="inline-flex flex-1 items-center justify-center rounded-full border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
                            No posting
                          </span>
                        )}
                        {canManageApplications ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingApplication(application)}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-cyan-200 hover:text-cyan-700"
                            >
                              <Pencil size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteApplication(application)}
                              disabled={deletingId === application.id}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:border-rose-200 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === application.id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Read only
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={currentPage <= 1}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage >= totalPages}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-gray-500 sm:p-12">
            No applications match those filters. Try widening your search or resetting filters.
          </div>
        )}
      </div>
    </section>
    {canManageApplications && editingApplication ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6"
          onClick={closeEditor}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-500">
                  Edit application
                </p>
                <h3 className="text-2xl font-bold text-slate-900">
                  {editForm.company || editingApplication.company}
                </h3>
                <p className="text-sm text-slate-500">
                  {editForm.title || editingApplication.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                disabled={savingEdit}
                className="rounded-full border border-gray-200 px-3 py-1 text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-600">
                  Company
                  <input
                    required
                    value={editForm.company}
                    onChange={(event) => handleEditFieldChange('company', event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-cyan-500"
                    autoFocus
                  />
                </label>
                <label className="text-sm font-semibold text-slate-600">
                  Role title
                  <input
                    required
                    value={editForm.title}
                    onChange={(event) => handleEditFieldChange('title', event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-cyan-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-600">
                  Status
                  <select
                    value={editForm.status}
                    onChange={(event) =>
                      handleEditFieldChange('status', event.target.value as JobApplication['status'])
                    }
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500"
                  >
                    {STATUS_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-600">
                  Applied date
                  <input
                    type="date"
                    value={editForm.appliedAt}
                    onChange={(event) => handleEditFieldChange('appliedAt', event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-cyan-500"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-600">
                  Location
                  <input
                    value={editForm.location}
                    onChange={(event) => handleEditFieldChange('location', event.target.value)}
                    placeholder="Remote, NYC, SF…"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-600">
                  Work style
                  <select
                    value={editForm.remote}
                    onChange={(event) =>
                      handleEditFieldChange('remote', event.target.value as RemotePreference)
                    }
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-cyan-500"
                  >
                    <option value="unknown">Not sure yet</option>
                    <option value="remote">Remote friendly</option>
                    <option value="onsite">On-site / Hybrid</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-600">
                  Source
                  <input
                    value={editForm.source}
                    onChange={(event) => handleEditFieldChange('source', event.target.value)}
                    placeholder="LinkedIn, Referral…"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="text-sm font-semibold text-slate-600">
                  Job link
                  <input
                    type="url"
                    value={editForm.jobPostUrl}
                    onChange={(event) => handleEditFieldChange('jobPostUrl', event.target.value)}
                    placeholder="https://company.com/careers/123"
                    className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm outline-none focus:border-cyan-500"
                  />
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-600">
                Notes
                <textarea
                  rows={4}
                  value={editForm.notes}
                  onChange={(event) => handleEditFieldChange('notes', event.target.value)}
                  placeholder="Interview prep, recruiter contact, follow-up reminders…"
                  className="mt-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-cyan-500"
                />
              </label>

              {editError ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
                  {editError}
                </p>
    ) : null}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={savingEdit}
                  className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-200/60 transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
