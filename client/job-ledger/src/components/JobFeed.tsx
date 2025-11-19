import { Link } from '@tanstack/react-router'
import {
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'

import {
  createApplication,
  fetchJobFeed,
  getSandboxRandomAppliedDate,
  getSandboxRandomStatus,
  isSandboxEnabled,
  refreshJobCache,
  type JobListing,
} from '../lib/api'
import { JobCard } from './JobCard'
import { JobDetailsModal } from './JobDetailsModal'
import { sanitizeDescription } from '../lib/text'
import { POPULAR_US_CITIES, US_STATES } from '../lib/locations'

const SOURCE_OPTIONS = [
  { value: 'usajobs', label: 'USAJOBS' },
  { value: 'adzuna', label: 'Adzuna' },
  { value: 'remotive', label: 'Remotive' },
  { value: 'jooble', label: 'Jooble' },
  { value: 'lever', label: 'Lever' },
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'workable', label: 'Workable' },
  { value: 'ashby', label: 'Ashby' },
  { value: 'recruitee', label: 'Recruitee' },
]

const REMOTE_OPTIONS: Array<{ value: 'all' | 'remote' | 'onsite'; label: string }> = [
  { value: 'all', label: 'All roles' },
  { value: 'remote', label: 'Remote only' },
  { value: 'onsite', label: 'On-site / Hybrid' },
]

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'salary_desc', label: 'Salary (high → low)' },
  { value: 'salary_asc', label: 'Salary (low → high)' },
  { value: 'title_asc', label: 'Title A → Z' },
  { value: 'title_desc', label: 'Title Z → A' },
]

const DEFAULT_QUERY = ''
const DEFAULT_LOC = ''
const PAGE_SIZE = 12

export function JobFeed() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [location, setLocation] = useState(DEFAULT_LOC)
  const [remoteFilter, setRemoteFilter] = useState<'all' | 'remote' | 'onsite'>('all')
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [sort, setSort] = useState('recent')
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null)
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle')
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null)
  const [savingApplicationId, setSavingApplicationId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [locationState, setLocationState] = useState('')
  const locationDatalistId = useId()

  const locationSuggestions = useMemo(() => {
    const normalized = location.trim().toLowerCase()
    return POPULAR_US_CITIES.filter((entry) => {
      const matchesCity = !normalized || entry.city.toLowerCase().includes(normalized)
      const matchesState = !locationState || entry.state === locationState
      return matchesCity && matchesState
    }).slice(0, 12)
  }, [location, locationState])

  const filtersInitializedRef = useRef(false)

  const filtersDirty =
    remoteFilter !== 'all' ||
    selectedSources.length > 0 ||
    sort !== 'recent' ||
    query !== DEFAULT_QUERY ||
    location !== DEFAULT_LOC ||
    locationState !== ''

  const hasFilters = Boolean(
    query.trim() ||
      location.trim() ||
      remoteFilter !== 'all' ||
      selectedSources.length ||
      sort !== 'recent' ||
      locationState.trim()
  )

  const remotePreference =
    remoteFilter === 'remote' ? true : remoteFilter === 'onsite' ? false : undefined

  const headline = useMemo(() => {
    if (!jobs.length) {
      return hasFilters
        ? 'No cached roles match those filters yet'
        : 'Fresh roles from your cached database'
    }

    if (!hasFilters) return `Showing ${jobs.length} of the latest cached roles`
    if (page <= 1) return `Showing ${jobs.length} curated roles`
    return `Showing ${jobs.length} curated roles across ${page} pages`
  }, [hasFilters, jobs, page])

  const fetchPage = async (targetPage: number, mode: 'replace' | 'append' = 'replace') => {
    if (mode === 'replace') {
      setStatus('loading')
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const { items, meta } = await fetchJobFeed({
        q: query,
        loc: location,
        page: targetPage,
        limit: PAGE_SIZE,
        remote: remotePreference,
        source: selectedSources,
        sort,
      })
      setJobs((prev) => (mode === 'append' ? [...prev, ...items] : items))
      setPage(targetPage)
      const returned = meta?.count ?? items.length
      const limitFromResponse = meta?.limit ?? PAGE_SIZE
      setHasMore(returned >= limitFromResponse)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Unexpected error occurred')
    } finally {
      if (mode === 'append') {
        setLoadingMore(false)
      }
    }
  }

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault()
    await fetchPage(1, 'replace')
  }

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    await fetchPage(page + 1, 'append')
  }

  const toggleSource = (value: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value)
      }
      return [...prev, value]
    })
  }

  const handleResetFilters = async () => {
    if (!filtersDirty) return
    setRemoteFilter('all')
    setSelectedSources([])
    setSort('recent')
    setQuery(DEFAULT_QUERY)
    setLocation(DEFAULT_LOC)
    setLocationState('')
    await fetchPage(1, 'replace')
  }

  const handleShowDetails = (job: JobListing) => {
    setSelectedJob(job)
  }

  const handleRefreshNow = async () => {
    if (refreshStatus === 'running') return
    setRefreshStatus('running')
    setRefreshMessage(null)
    try {
      await refreshJobCache()
      setRefreshStatus('success')
      setRefreshMessage('Fetching fresh listings…')
      await fetchPage(1, 'replace')
      setRefreshMessage('Imported the latest jobs from our sources.')
    } catch (err) {
      setRefreshStatus('error')
      setRefreshMessage(
        err instanceof Error ? err.message : 'Unable to refresh feed at the moment.',
      )
    } finally {
      window.setTimeout(() => {
        setRefreshStatus('idle')
      }, 2500)
    }
  }

  const sandboxMode = isSandboxEnabled()

  const handleSaveJob = async (job: JobListing) => {
    if (savingApplicationId) return
    const appliedAtIso = sandboxMode
      ? getSandboxRandomAppliedDate()
      : job.postedAt && !Number.isNaN(Date.parse(job.postedAt))
        ? new Date(job.postedAt).toISOString()
        : undefined
    const statusForPayload = sandboxMode ? getSandboxRandomStatus() : 'planned'
    setSavingApplicationId(job.externalId ?? job.url)
    setSaveStatus('loading')
    setSaveMessage(`Adding ${job.title} to your Applications…`)
    try {
      const cleanNotes = job.description ? sanitizeDescription(job.description) : undefined
      await createApplication({
        title: job.title,
        company: job.company,
        status: statusForPayload,
        appliedAt: appliedAtIso,
        jobPostUrl: job.url,
        notes: cleanNotes,
        source: job.source || 'manual',
        location: job.location,
        remote: job.remote,
      })
      setSaveStatus('success')
      setSaveMessage(`${job.title} saved to your Applications board.`)
    } catch (err) {
      setSaveStatus('error')
      setSaveMessage(
        err instanceof Error ? err.message : 'Unable to add that job to Applications right now.',
      )
    } finally {
      setSavingApplicationId(null)
    }
  }

  useEffect(() => {
    fetchPage(1, 'replace')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!filtersInitializedRef.current) {
      filtersInitializedRef.current = true
      return
    }
    fetchPage(1, 'replace')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteFilter, selectedSources, sort])

  useEffect(() => {
    if (saveStatus === 'success' || saveStatus === 'error') {
      const timer = window.setTimeout(() => {
        setSaveStatus('idle')
        setSaveMessage(null)
      }, 4000)
      return () => window.clearTimeout(timer)
    }
    return
  }, [saveStatus])

  const emptyStateMessage = hasFilters
    ? 'No jobs match those filters yet. Try tweaking filters or clearing them.'
    : 'Nothing to show yet. Try a broader keyword or location.'

  const insights = useMemo(() => {
    if (!jobs.length) {
      return [
        { label: 'Remote friendly', value: '—', detail: 'Start searching to see ratios' },
        { label: 'Top source', value: '—', detail: 'Source mix updates once data arrives' },
        { label: 'Salary window', value: '—', detail: 'We display medians when available' },
      ]
    }

    const remoteCount = jobs.filter((job) => job.remote).length
    const remotePercent = Math.round((remoteCount / jobs.length) * 100)
    const sourceCounts = jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.source] = (acc[job.source] ?? 0) + 1
      return acc
    }, {})
    const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const salaries = jobs
      .map((job) => job.salaryMax ?? job.salaryMin)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b)
    const medianSalary =
      salaries.length > 0 ? `$${salaries[Math.floor(salaries.length / 2)].toLocaleString()}` : 'Varied'

    return [
      {
        label: 'Remote friendly',
        value: `${remotePercent}%`,
        detail: `${remoteCount} of ${jobs.length} roles allow remote`,
      },
      {
        label: 'Top source',
        value: topSource ? topSource.toUpperCase() : 'Mixed',
        detail: `${Object.keys(sourceCounts).length} sources active`,
      },
      { label: 'Salary window', value: medianSalary, detail: 'Median of shared salaries' },
    ]
  }, [jobs])

  return (
    <section className="relative rounded-[32px] border border-slate-100 bg-white/90 p-8 shadow-2xl shadow-slate-200/60">
      <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      <div className="space-y-8">
        <header className="rounded-[28px] border border-slate-100 bg-gradient-to-r from-white to-slate-50/60 p-8 text-center shadow-inner shadow-white">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-slate-500">
            <Sparkles size={16} className="text-sky-500" /> Job Ledger feed
          </div>
          <h2 className="mt-4 text-4xl font-black text-slate-900">Explore curated opportunities</h2>
          <p className="mt-2 text-sm text-slate-500">{headline}</p>
          <p className="mt-2 text-xs text-slate-500">
            Tracking your own pipeline?{' '}
            <Link to="/applications" className="font-semibold text-sky-600 hover:text-sky-800">
              Import roles into the tracker ↗
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={handleRefreshNow}
              disabled={refreshStatus === 'running'}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 font-semibold text-slate-700 transition hover:border-slate-300 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshStatus === 'running' ? 'animate-spin text-sky-500' : ''}
              />
              {refreshStatus === 'running' ? 'Refreshing cache…' : 'Fetch latest jobs'}
            </button>
            {refreshMessage ? (
              <span
                className={`text-xs ${
                  refreshStatus === 'error' ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {refreshMessage}
              </span>
            ) : null}
          </div>
        </header>

        <form
          onSubmit={handleSearch}
          className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/50"
        >
          <div className="grid gap-4 sm:grid-cols-[2fr,2fr,auto]">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-400">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keyword (e.g. frontend, data engineer)"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </label>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-sky-400 sm:grid-cols-2">
              <label className="flex items-center gap-3 text-slate-600">
                <MapPin size={18} className="text-slate-400" />
                <div className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                    City / Region
                  </span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Start typing to search cities"
                    list={locationDatalistId}
                    className="mt-1 w-full bg-transparent text-sm outline-none"
                    autoComplete="address-level2"
                  />
                  <datalist id={locationDatalistId}>
                    {locationSuggestions.map((entry) => (
                      <option key={`${entry.city}-${entry.state}`} value={entry.city}>
                        {entry.city}, {entry.state}
                      </option>
                    ))}
                  </datalist>
                </div>
              </label>
              <label className="flex flex-col text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  State (optional)
                </span>
                <select
                  value={locationState}
                  onChange={(event) => setLocationState(event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                >
                  <option value="">Any state</option>
                  {US_STATES.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:from-sky-600 hover:to-indigo-600"
            >
              {status === 'loading' ? 'Searching…' : 'Search feed'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold">
              <SlidersHorizontal size={12} /> {filtersDirty ? 'Custom filters engaged' : 'Default filters'}
            </span>
            {filtersDirty ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-slate-600 underline-offset-4 hover:underline"
              >
                <RefreshCw size={12} /> Reset to default
              </button>
            ) : null}
          </div>
        </form>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-sm shadow-slate-100">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Remote</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {REMOTE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRemoteFilter(option.value)}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    remoteFilter === option.value
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-sm shadow-slate-100">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Sources</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((source) => {
                const isSelected = selectedSources.includes(source.value)
                return (
                  <button
                    key={source.value}
                    type="button"
                    onClick={() => toggleSource(source.value)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {source.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-sm shadow-slate-100">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Sort</p>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-3 text-xs text-slate-500">
              Prioritize recent listings, salaries, or alphabetical order for browsing clarity.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {insights.map((insight) => (
            <div
              key={insight.label}
              className="rounded-[28px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-5 shadow-inner shadow-white"
            >
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{insight.label}</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{insight.value}</p>
              <p className="text-xs text-slate-500">{insight.detail}</p>
            </div>
          ))}
        </div>

        {status === 'error' && error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {saveMessage ? (
          <div
            className={`rounded-[28px] border px-4 py-3 text-sm ${
              saveStatus === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : saveStatus === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {saveMessage}
          </div>
        ) : null}

        {status === 'loading' && !jobs.length ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-slate-100 bg-white/80 py-20 text-slate-500">
            <Loader2 className="animate-spin" size={32} />
            <p>Collecting cached jobs…</p>
          </div>
        ) : jobs.length ? (
          <>
            <p className="text-center text-sm text-slate-500">{headline}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job) => (
                <JobCard
                  key={job.externalId ?? job.url}
                  job={job}
                  onShowDetails={() => handleShowDetails(job)}
                  onSaveToApplications={() => handleSaveJob(job)}
                  savingToApplications={savingApplicationId === (job.externalId ?? job.url)}
                />
              ))}
            </div>
            {hasMore ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Loading more
                    </>
                  ) : (
                    'Load more roles'
                  )}
                </button>
              </div>
            ) : (
              <p className="text-center text-xs uppercase tracking-[0.4em] text-slate-400">
                You're caught up on cached results
              </p>
            )}
          </>
        ) : (
          <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
            {emptyStateMessage}
          </div>
        )}
      </div>

      {selectedJob ? <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} /> : null}
    </section>
  )
}
