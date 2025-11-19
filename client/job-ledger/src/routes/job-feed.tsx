import { Link, createFileRoute } from '@tanstack/react-router'
import { Compass, Layers, NotebookPen } from 'lucide-react'
import { JobFeed } from '../components/JobFeed'

const JobFeedPage = () => (
  <div className="space-y-12">
    <section className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-800 p-8 text-white shadow-2xl shadow-slate-900/50">
      <div className="flex flex-wrap items-center gap-8">
        <div className="flex-1 space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]">
            <Compass size={14} /> Signal-rich feed
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Discover roles, import them into the tracker, and stay in flow.
          </h1>
          <p className="text-sm text-white/80">
            Our feed pulls curated results from USAJOBS, Lever, Remotive, Adzuna, and more. Refine by
            source, remote preference, salary sort, and keyword or location to get a shortlist you
            actually want to pursue.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/applications"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/30"
            >
              Send to tracker <NotebookPen size={14} />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white"
            >
              How we built this <Layers size={14} />
            </Link>
          </div>
        </div>
        <div className="min-w-[220px] flex-1 rounded-[24px] border border-white/30 bg-white/10 p-6 text-sm">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Highlights</p>
          <ul className="mt-4 space-y-3 text-white/90">
            <li>• Debounced search for human typing rhythm</li>
            <li>• Quick filters for remote-only, salary, and source</li>
            <li>• Detailed overlays for every listing</li>
            <li>• CTA to import listings into Applications page</li>
          </ul>
        </div>
      </div>
    </section>

    <JobFeed />
  </div>
)

export const Route = createFileRoute('/job-feed')({
  component: JobFeedPage,
})
