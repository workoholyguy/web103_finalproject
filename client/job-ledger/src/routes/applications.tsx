import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, ClipboardCheck, Layers } from 'lucide-react'

import { ApplicationsBoard } from '../components/ApplicationsBoard'
import { ApplicationComposer } from '../components/ApplicationComposer'
import { isSandboxEnabled } from '../lib/api'

const snapshotCards = [
  {
    title: 'From Scratch',
    body: 'Plan, apply, interview, offer, reject — every stage is color-coded so you can scan the status of your search at a glance.',
  },
  {
    title: 'From Job Feed',
    body: 'Import any listing you love. Keep the provenance (source, remote flag, salary) so your tracker stays enriched.',
  },
  {
    title: 'From Future Integrations',
    body: 'Upcoming releases layer in richer analytics, reminders, and collaboration so your workflow keeps leveling up.',
  },
]

const ApplicationsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0)
  const sandboxMode = isSandboxEnabled()

  return (
    <div className="space-y-12">
    <section className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 p-8 text-white shadow-2xl">
      <div className="flex flex-wrap items-center gap-8">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em]">
            <ClipboardCheck size={14} /> Tracker OS
          </p>
          <h1 className="text-4xl font-black">Build your application pipeline with intention.</h1>
          <p className="text-sm text-white/80">
            The Applications page combines a manual composer, a “pull from feed” importer, and a
            searchable board so the roles you care about move forward together.
          </p>
          {sandboxMode ? (
            <p className="text-xs text-white/60">
              Visiting without an account? Anything you add is stored locally so every visitor keeps their
              own sandbox pipeline.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <Link
              to="/job-feed"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/40"
            >
              Browse roles <ArrowRight size={14} />
            </Link>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white"
            >
              Preview account
            </Link>
          </div>
        </div>
        <div className="flex-1 min-w-[250px] space-y-4 rounded-[28px] border border-white/30 bg-white/10 p-6 text-sm">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Capabilities</p>
          <ul className="space-y-2 text-white/80">
            <li>• Create trackers from scratch</li>
            <li>• Import listings from the Job Feed</li>
            <li>• Debounced search + filters (status, timeframe)</li>
            <li>• Account-based sync keeps every device updated</li>
          </ul>
        </div>
      </div>
    </section>

    <div className="grid gap-6 md:grid-cols-3">
      {snapshotCards.map((card) => (
        <article
          key={card.title}
          className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/60"
        >
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Pipeline</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{card.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{card.body}</p>
        </article>
      ))}
    </div>

    <ApplicationComposer onCreated={() => setRefreshKey((value) => value + 1)} />

    <div className="rounded-[32px] border border-slate-100 bg-white/90 p-8 shadow-2xl shadow-slate-200/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Live data</p>
          <h3 className="mt-2 text-3xl font-black text-slate-900">Search & filter your saved roles</h3>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Keyword search, status chips, timeframe filters, and remote context ensure you can zero
            in on the opportunities that need care. Signed-in users automatically see their own
            pipelines without extra setup.
          </p>
        </div>
        <Link
          to="/job-feed"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700"
        >
          Sync from feed <Layers size={14} />
        </Link>
      </div>
      <div className="mt-10">
        <ApplicationsBoard refreshKey={refreshKey} />
      </div>
    </div>
  </div>
  )
}

export const Route = createFileRoute('/applications')({
  component: ApplicationsPage,
})
