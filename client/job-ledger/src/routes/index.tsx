import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Sparkles, Target, Trophy } from 'lucide-react'

const frame = [
  {
    label: 'Name',
    title: 'Job Ledger',
    body: 'We built Job Ledger so early-career talent can keep every lead, follow-up, and win in one disciplined workspace instead of scattered docs.',
    accent: 'from-blue-500 to-indigo-500',
  },
  {
    label: 'Same',
    title: 'Same vibe as a personal trainer',
    body: 'Think of it like a personal career trainer — a friendly push to run searches, log outreach, and stay accountable every single week.',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    label: 'Fame',
    title: 'Famous for obsessive visibility',
    body: 'Live job feed, timeline tags, and status summaries keep every opportunity visible so you always know what deserves energy next.',
    accent: 'from-purple-500 to-pink-500',
  },
  {
    label: 'Aim',
    title: 'Aim — short-term sprints',
    body: 'Right now we are polishing the tracker experience, tightening filters, and helping you capture roles you find online in seconds.',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    label: 'Game',
    title: 'Game — long-term legend',
    body: 'Long term we’re building the job-search operating system: analytics, accountability rituals, and insights that nudge you toward offers faster.',
    accent: 'from-cyan-500 to-blue-500',
  },
]

const features = [
  {
    title: 'Application Tracker',
    body: 'Capture every company, role, status, date, and note. Update stages, set goals, and visualize progress.',
    status: 'Now live',
  },
  {
    title: 'Integrated Job Feed',
    body: 'Aggregate USAJOBS, Adzuna, Remotive, Lever, and more with polished cards and deep filters.',
    status: 'Powered by Express API',
  },
  {
    title: 'Status Dashboard',
    body: 'See how many applications are planned, applied, interviewing, offers, or rejected at a glance.',
    status: 'Coming in Milestone 5',
  },
  {
    title: 'Search & Filter',
    body: 'Debounced search, remote toggles, and timeframe filters match README goals for precision scanning.',
    status: 'Ready today',
  },
  {
    title: 'Notes & Follow Ups',
    body: 'Every job captures personal notes, recruiter details, reminders, and salary context.',
    status: 'Design locked',
  },
  {
    title: 'Account & Auth',
    body: 'Signup/signin UI is now staged so Supabase or custom auth can connect later.',
    status: 'UI stubbed',
  },
]

const Stats = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {[
      { label: 'Curated roles watched', value: '3,200+', change: '+18% QoQ' },
      { label: 'Active pipelines', value: '58', change: 'live inside tracker' },
      { label: 'Integrations wired', value: '8', change: 'job APIs & sources' },
      { label: 'Product sprints', value: '4', change: 'CodePath cadence' },
    ].map((stat) => (
      <div
        key={stat.label}
        className="rounded-3xl border border-white/50 bg-white/80 px-6 py-5 shadow-inner shadow-slate-100"
      >
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{stat.label}</p>
        <p className="text-3xl font-black text-slate-900 mt-2">{stat.value}</p>
        <p className="text-sm text-slate-500">{stat.change}</p>
      </div>
    ))}
  </div>
)

const FeatureGrid = () => (
  <div className="grid gap-6 lg:grid-cols-3">
    {features.map((feature) => (
      <article
        key={feature.title}
        className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 transition group-hover:opacity-80" />
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{feature.status}</p>
        <h3 className="mt-3 text-2xl font-bold text-slate-900">{feature.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{feature.body}</p>
        <Link
          to={feature.title === 'Integrated Job Feed' ? '/job-feed' : '/applications'}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:gap-3"
        >
          Explore <ArrowRight size={14} />
        </Link>
      </article>
    ))}
  </div>
)

const FrameGrid = () => (
  <div className="grid gap-5 md:grid-cols-2">
    {frame.map((item) => (
      <article
        key={item.label}
        className="rounded-3xl border border-white/50 bg-white/80 p-6 shadow-lg shadow-slate-200/50"
      >
        <span
          className={`inline-flex items-center rounded-full bg-gradient-to-r ${item.accent} px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-white`}
        >
          {item.label}
        </span>
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">{item.title}</h3>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{item.body}</p>
      </article>
    ))}
  </div>
)

const HomePage = () => (
  <div className="space-y-20">
    <section className="relative overflow-hidden rounded-[32px] border border-white/40 bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-900 p-10 text-white shadow-2xl">
      <div className="absolute inset-y-0 right-0 w-1/2 opacity-30 blur-3xl">
        <div className="h-full w-full bg-gradient-to-br from-sky-400 to-purple-600" />
      </div>
      <div className="relative z-10 space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.45em] text-slate-100">
          <Sparkles size={14} /> Job Ledger v2
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-black leading-tight sm:text-6xl">
            A cinematic operating system for ambitious job hunters.
          </h1>
          <p className="text-lg text-white/80 sm:max-w-3xl">
            Bold visuals meet a practical workflow so you can research roles, capture outreach, and
            celebrate progress without losing the joy of the search.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/job-feed"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 shadow-xl shadow-slate-900/40 transition hover:-translate-y-0.5"
          >
            Explore job feed <ArrowRight size={16} />
          </Link>
          <Link
            to="/applications"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5"
          >
            Open tracker
          </Link>
        </div>
        <Stats />
      </div>
    </section>

    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-400">
          Story Frame
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">Name → Same → Fame → Aim → Game</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Translating our Why into product cues keeps the brand voice consistent across every page,
          page hero, and call-to-action.
        </p>
      </header>
      <FrameGrid />
    </section>

    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Feature flight plan</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">
            Everything promised in the README
          </h2>
        </div>
        <Link
          to="/applications"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
        >
          View roadmap doc <ArrowRight size={14} />
        </Link>
      </header>
      <FeatureGrid />
    </section>

    <section className="rounded-[32px] border border-slate-100 bg-white/90 p-8 shadow-lg">
      <h3 className="text-3xl font-black text-slate-900">Why the hype?</h3>
      <p className="mt-4 text-sm text-slate-600 leading-relaxed">
        Because your search deserves structure. The layout spotlights what to research, which
        applications need attention, and when to follow up so the process feels intentional instead
        of overwhelming.
      </p>
      <p className="mt-4 text-sm text-slate-600">
        Live job feed, tracker board, stats, account preview, and notes all live in the navigation
        today. Explore each one to see how Job Ledger keeps every part of the hunt under control.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          to="/job-feed"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Job feed <Trophy size={14} />
        </Link>
        <Link
          to="/account"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700"
        >
          Account preview <Target size={14} />
        </Link>
      </div>
    </section>

    <section className="rounded-[32px] border border-slate-100 bg-slate-900 p-10 text-white">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Ready?</p>
          <h3 className="text-3xl font-black">
            Plug into Job Ledger and keep applications moving every day.
          </h3>
          <p className="text-sm text-white/70">
            Sync your pipeline, craft notes, and celebrate offers faster with our refreshed styling.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/applications"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900"
          >
            Open tracker
          </Link>
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 font-semibold text-white"
          >
            Meet the team <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  </div>
)

export const Route = createFileRoute('/')({
  component: HomePage,
})
