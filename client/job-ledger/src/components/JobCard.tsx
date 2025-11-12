import type { JobListing } from '../lib/api'

const sourceColors: Record<string, string> = {
  usajobs: 'bg-emerald-100 text-emerald-800',
  adzuna: 'bg-blue-100 text-blue-800',
  remotive: 'bg-purple-100 text-purple-800',
  jooble: 'bg-pink-100 text-pink-800',
}

export function JobCard({ job, onShowDetails }: { job: JobListing; onShowDetails?: () => void }) {
  const hasSalary = job.salaryMin || job.salaryMax
  const postedAt = job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'N/A'
  const sourceClass = sourceColors[job.source] ?? 'bg-gray-100 text-gray-800'

  return (
    <article className="p-6 rounded-3xl bg-white/90 shadow-sm border border-gray-100 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-500">{job.company}</p>
          <h3 className="text-xl font-bold text-gray-900">{job.title}</h3>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${sourceClass}`}>
          {job.source.toUpperCase()}
        </span>
      </header>

      <p className="text-sm text-gray-600 leading-relaxed">
        {job.description ?? 'No description provided.'}
      </p>

      <dl className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400">Location</dt>
          <dd>{job.remote ? 'Remote' : job.location ?? 'Not specified'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-gray-400">Posted</dt>
          <dd>{postedAt}</dd>
        </div>
        {hasSalary ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-400">Salary</dt>
            <dd>
              {job.salaryMin ? job.salaryMin.toLocaleString() : '—'} -{' '}
              {job.salaryMax ? job.salaryMax.toLocaleString() : '—'} {job.currency ?? ''}
            </dd>
          </div>
        ) : null}
      </dl>

      <footer className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex gap-3">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-cyan-700 font-semibold hover:text-cyan-900"
          >
            View posting ↗
          </a>
          {onShowDetails ? (
            <button
              type="button"
              onClick={onShowDetails}
              className="text-cyan-700 font-semibold hover:text-cyan-900"
            >
              More details
            </button>
          ) : null}
        </div>
        {job.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {job.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </footer>
    </article>
  )
}
