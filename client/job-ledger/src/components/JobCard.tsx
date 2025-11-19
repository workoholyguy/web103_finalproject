import {
  Building2,
  CalendarClock,
  ClipboardPlus,
  DollarSign,
  Loader2,
  MapPin,
} from 'lucide-react'
import { type KeyboardEvent, type MouseEvent } from 'react'

import type { JobListing } from '../lib/api'
import { sanitizeDescription } from '../lib/text'

const sourceColors: Record<string, string> = {
  usajobs: 'bg-emerald-100 text-emerald-800',
  adzuna: 'bg-blue-100 text-blue-800',
  remotive: 'bg-purple-100 text-purple-800',
  jooble: 'bg-pink-100 text-pink-800',
}

type JobCardProps = {
  job: JobListing
  onShowDetails?: () => void
  onSaveToApplications?: () => void
  savingToApplications?: boolean
}

export function JobCard({
  job,
  onShowDetails,
  onSaveToApplications,
  savingToApplications = false,
}: JobCardProps) {
  const hasSalary = job.salaryMin || job.salaryMax
  const postedAt = job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'N/A'
  const sourceClass = sourceColors[job.source] ?? 'bg-slate-100 text-slate-800'
  const cleanDescription = sanitizeDescription(job.description)
  const description = cleanDescription
    ? `${cleanDescription.slice(0, 160)}${cleanDescription.length > 160 ? '…' : ''}`
    : 'No description provided.'

  const handleCardClick = () => {
    onShowDetails?.()
  }

  const stopPropagation = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!onShowDetails) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onShowDetails()
    }
  }

  return (
    <article
      className="relative flex flex-col gap-4 rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/60 cursor-pointer transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={onShowDetails ? 0 : -1}
      role={onShowDetails ? 'button' : undefined}
    >
      <div className="absolute inset-x-4 top-0 h-1 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400" />
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
            <Building2 size={12} /> {job.company}
          </p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">{job.title}</h3>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${sourceClass}`}>
          {job.source.toUpperCase()}
        </span>
      </header>

      <p className="text-sm leading-relaxed text-slate-600">{description}</p>

      <dl className="grid grid-cols-2 gap-3 text-sm text-slate-700">
        <div className="flex flex-col gap-1">
          <dt className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            <MapPin size={12} /> Location
          </dt>
          <dd>{job.remote ? 'Remote' : job.location ?? 'Not specified'}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            <CalendarClock size={12} /> Posted
          </dt>
          <dd>{postedAt}</dd>
        </div>
        {hasSalary ? (
          <div className="flex flex-col gap-1">
            <dt className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <DollarSign size={12} /> Salary
            </dt>
            <dd>
              {job.salaryMin ? job.salaryMin.toLocaleString() : '—'} -{' '}
              {job.salaryMax ? job.salaryMax.toLocaleString() : '—'} {job.currency ?? ''}
            </dd>
          </div>
        ) : null}
      </dl>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div className="flex gap-3">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-semibold text-sky-600 transition hover:text-sky-800"
            onClick={stopPropagation}
          >
            View posting ↗
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onShowDetails ? (
            <button
              type="button"
              onClick={(event) => {
                stopPropagation(event)
                onShowDetails()
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Open details
            </button>
          ) : null}
          {onSaveToApplications ? (
            <button
              type="button"
              onClick={(event) => {
                stopPropagation(event)
                onSaveToApplications()
              }}
              disabled={savingToApplications}
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingToApplications ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Saving…
                </>
              ) : (
                <>
                  <ClipboardPlus size={14} />
                  Save to applications
                </>
              )}
            </button>
          ) : null}
          {job.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {job.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    </article>
  )
}
