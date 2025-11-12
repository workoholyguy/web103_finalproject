import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { fetchJobFeed, type JobListing } from '../lib/api'
import { JobCard } from './JobCard'
import { JobDetailsModal } from './JobDetailsModal'

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

  const filtersInitializedRef = useRef(false)

  const filtersDirty =
    remoteFilter !== 'all' || selectedSources.length > 0 || sort !== 'recent'

  const hasFilters = Boolean(
    query.trim() ||
      location.trim() ||
      remoteFilter !== 'all' ||
      selectedSources.length ||
      sort !== 'recent'
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

  const handleSearch = async (event?: React.FormEvent) => {
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

  const handleResetFilters = () => {
    if (!filtersDirty) return
    setRemoteFilter('all')
    setSelectedSources([])
    setSort('recent')
  }

  const handleShowDetails = (job: JobListing) => {
    setSelectedJob(job)
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

  const emptyStateMessage = hasFilters
    ? 'No jobs match those filters yet. Try tweaking filters or clearing them.'
    : 'Nothing to show yet. Try a broader keyword or location.'

  return (
    <main className="bg-slate-50 min-h-screen">
      <section>
        <div className="mx-auto max-w-6xl px-4 py-12 space-y-10">
          <header className="text-center space-y-4">
            <p className="text-sm font-semibold text-cyan-700">Job Ledger feed</p>
            <h1 className="text-4xl font-black text-gray-900">Explore curated opportunities</h1>
            <p className="text-gray-500 max-w-2xl mx-auto">{headline}</p>
            <p className="text-sm text-gray-500">
              Tracking your own pipeline?{' '}
              <Link to="/applications" className="font-semibold text-cyan-700 hover:text-cyan-900">
                Open the application tracker ↗
              </Link>
            </p>
          </header>

          <form
            onSubmit={handleSearch}
            className="grid gap-4 rounded-3xl bg-white p-6 shadow-lg border border-gray-100 sm:grid-cols-[2fr,2fr,auto]"
          >
            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500">
              <Search size={18} className="text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keyword (e.g. frontend, data engineer)"
                className="bg-transparent text-sm flex-1 outline-none"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-cyan-500">
              <span className="text-sm font-medium text-gray-500">Location</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, country, Remote"
                className="bg-transparent text-sm flex-1 outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="rounded-2xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-cyan-300 shadow disabled:opacity-70"
            >
              {status === 'loading' ? 'Searching…' : 'Search'}
            </button>
          </form>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-wrap items-start gap-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Work style</p>
                <div className="flex flex-wrap gap-2">
                  {REMOTE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRemoteFilter(option.value)}
                      className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        remoteFilter === option.value
                          ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 flex-1 min-w-[220px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sources</p>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_OPTIONS.map((option) => {
                    const active = selectedSources.includes(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleSource(option.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-cyan-600 bg-cyan-600 text-white'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2 min-w-[180px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sort by</p>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 focus:border-cyan-500 focus:outline-none"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={!filtersDirty}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-40"
              >
                Reset filters
              </button>
            </div>
          </div>

          {status === 'error' && error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          ) : null}

          {status === 'loading' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
              <Loader2 className="animate-spin" size={32} />
              <p>Fetching fresh jobs…</p>
            </div>
          ) : jobs.length ? (
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                {jobs.map((job) => (
                  <JobCard key={job.externalId} job={job} onShowDetails={() => handleShowDetails(job)} />
                ))}
              </div>

              <div className="flex items-center justify-center">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white px-6 py-3 text-sm font-semibold text-cyan-700 shadow disabled:opacity-70"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Loading more…
                      </>
                    ) : (
                      'Load more jobs'
                    )}
                  </button>
                ) : (
                  <p className="text-sm text-gray-500">You're caught up on cached results.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-500">
              {emptyStateMessage}
            </div>
          )}
        </div>
      </section>

      {selectedJob ? <JobDetailsModal job={selectedJob} onClose={() => setSelectedJob(null)} /> : null}
    </main>
  )
}
