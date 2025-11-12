import type { JobListing } from '../lib/api'

export function JobDetailsModal({ job, onClose }: { job: JobListing; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-700">{job.source.toUpperCase()}</p>
            <h2 className="text-3xl font-black text-gray-900">{job.title}</h2>
            <p className="text-lg text-gray-600">{job.company}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-900"
          >
            Close ✕
          </button>
        </div>

        <div className="mt-6 grid gap-4 text-sm text-gray-600 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Location</p>
            <p>{job.remote ? 'Remote' : job.location || 'Unspecified'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Posted</p>
            <p>{job.postedAt ? new Date(job.postedAt).toLocaleString() : 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Salary</p>
            <p>
              {job.salaryMin ? job.salaryMin.toLocaleString() : '—'} -{' '}
              {job.salaryMax ? job.salaryMax.toLocaleString() : '—'} {job.currency ?? ''}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Tags</p>
            <p>{job.tags?.join(', ') || 'None'}</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-gray-700">
          <p className="text-xs uppercase tracking-wide text-gray-400">Description</p>
          <p className="whitespace-pre-line leading-relaxed">
            {job.description || 'No description provided.'}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-cyan-200 shadow"
          >
            Open job posting ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
