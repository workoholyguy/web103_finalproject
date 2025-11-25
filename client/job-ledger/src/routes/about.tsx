import { Link, createFileRoute } from '@tanstack/react-router'
import {
  BellRing,
  CalendarDays,
  ClipboardList,
  Cloud,
  Cpu,
  Database,
  Flame,
  HeartHandshake,
  Layers,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users2,
} from 'lucide-react'

const stats = [
  {
    label: 'Applications tracked',
    value: '142',
    detail: 'SWE, Product + Design roles',
  },
  {
    label: 'Rituals logged',
    value: '37',
    detail: 'standups, retros, follow-ups',
  },
  {
    label: 'Community interviews',
    value: '28',
    detail: 'mentors, alumni, recruiters',
  },
]

const timeline = [
  {
    era: 'Winter 2023',
    title: 'Chaos + spreadsheets',
    description:
      'We bounced between tabs to keep up with recruiters. Important conversations drowned in comments and half-finished Trello cards.',
  },
  {
    era: 'Spring 2024',
    title: 'Prototype pressure cooker',
    description:
      'Early prototypes leaned into bold gradients, cinematic copy, and the Name → Same → Fame → Aim → Game storytelling system.',
  },
  {
    era: 'Summer 2024',
    title: 'Ledger as daily ritual',
    description:
      'The UI shipped with a job feed, notes, and reminders so we could log gratitude, next steps, and comp data in one place.',
  },
  {
    era: 'Fall 2024',
    title: 'Beyond the capstone',
    description:
      'Auth, analytics, and shareable dashboards are on deck so accountability partners can review pipelines live.',
  },
]

const values = [
  {
    title: 'Cinematic clarity',
    description:
      'Bold gradients, grids, and typography turn pipeline reviews into rituals you look forward to instead of chores.',
    icon: Sparkles,
  },
  {
    title: 'Relationship-first metrics',
    description:
      'We track the context around recruiters, referrals, and warm intros so every metric ties back to a human story.',
    icon: HeartHandshake,
  },
  {
    title: 'Systems over luck',
    description:
      'Structured cadences, notes, and nudges make sure the job hunt feels like a product launch rather than a guessing game.',
    icon: Target,
  },
]

const commitments = [
  {
    title: 'Single source of truth',
    description: 'Applications, notes, compensation intel, and rituals stay synced across the board.',
    icon: ClipboardList,
  },
  {
    title: 'Timeboxed nudges',
    description: 'Weekly retros, follow-ups, and outreach prompts keep momentum high without burnout.',
    icon: BellRing,
  },
  {
    title: 'Security + trust',
    description: 'Data exports ship now; lightweight auth, encryption, and sharing controls are next.',
    icon: ShieldCheck,
  },
]

const techStack = [
  {
    title: 'Client experience',
    description: 'React 19 + Vite + TypeScript, TanStack Router, Tailwind, and Lucide icons.',
    icon: Cpu,
  },
  {
    title: 'API surface',
    description: 'Express.js services orchestrate job feeds, application CRUD, and auth flows.',
    icon: Server,
  },
  {
    title: 'Data layer',
    description: 'PostgreSQL stores applications, statuses, and notes with relational modeling.',
    icon: Database,
  },
  {
    title: 'Hosting pipeline',
    description: 'Render powers the Node API while Netlify deploys the Vite SPA with env-based routing.',
    icon: Cloud,
  },
  {
    title: 'Security + auth',
    description: 'JWT access tokens, bcrypt hashing, and rotation-friendly Postgres sessions.',
    icon: Shield,
  },
  {
    title: 'DX + visuals',
    description: 'Vitest, ESLint, Prettier, and a three.js/postprocessing Hyperspeed scene for flair.',
    icon: Layers,
  },
]

const AboutPage = () => (
  <div className="space-y-12 pb-16">
    <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-slate-950 text-white shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950" />
      <div className="absolute -right-10 top-6 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl" />
      <div className="absolute -bottom-10 left-6 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="relative z-10 grid gap-10 p-10 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em]">
            <Sparkles size={14} /> About Job Ledger
          </p>
          <h1 className="text-4xl font-black lg:text-5xl">
            We turned the job search into a cinematic operating system.
          </h1>
          <p className="text-base text-white/80">
            Job Ledger started when Omar Madjitov needed a calmer system to juggle dozens of applications. It
            evolved into the weekly ritual that keeps conversations warm, wins documented, and offers judged
            with signal instead of stress.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/job-feed"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-white/30"
            >
              Explore the product <Rocket size={16} />
            </Link>
            <Link
              to="/applications"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white"
            >
              Peek at the pipeline <Target size={16} />
            </Link>
          </div>
        </div>
        <div className="space-y-4 rounded-[32px] border border-white/20 bg-white/5 p-6 backdrop-blur">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
            <Flame size={14} />
            Mission brief
          </p>
          <p className="text-lg font-semibold">
            Treat every recruiter, hiring manager, and mentor like they are part of the launch team.
          </p>
          <p className="text-sm text-white/70">
            That means keeping receipts on every outreach, aligning comp data with opportunity size, and
            automating the follow-up rituals that usually fall through the cracks.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              <TrendingUp size={14} /> Metrics ready
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              <CalendarDays size={14} /> Weekly logs
            </span>
          </div>
        </div>
      </div>
      <div className="relative z-10 grid gap-4 border-t border-white/10 px-10 pb-8 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-white/15 bg-white/5 p-4 text-white backdrop-blur"
          >
            <p className="text-3xl font-black">{stat.value}</p>
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">{stat.label}</p>
            <p className="text-xs text-white/60">{stat.detail}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="grid gap-8 rounded-[32px] border border-slate-100 bg-white/90 p-8 shadow-xl shadow-slate-200/60 lg:grid-cols-[1.2fr,0.8fr]">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Why we exist</p>
        <h2 className="text-3xl font-black text-slate-900">A calm operating system for ambitious job seekers.</h2>
        <p className="text-base text-slate-600">
          Portfolio updates, recruiter emails, and offer math deserve the same rigor as shipping a product.
          We pair bold storytelling with pragmatic workflows so you can feel proud of the effort and confident
          in your data.
        </p>
        <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white/70 p-6">
          <p className="text-sm font-semibold text-slate-900">What we&apos;re building next</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Secure sign-in with exportable, privacy-first profiles.</li>
            <li>Applied vs. pipeline analytics that show where momentum leaks.</li>
            <li>Shared dashboards so accountability partners can review progress live.</li>
          </ul>
          <Link
            to="/applications"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline decoration-slate-300 decoration-2"
          >
            Track your own board
          </Link>
        </div>
      </div>
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Build timeline</p>
        <div className="space-y-4">
          {timeline.map((entry) => (
            <article key={entry.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">{entry.era}</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{entry.title}</h3>
              <p className="text-sm text-slate-600">{entry.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="rounded-[32px] border border-slate-100 bg-white/90 p-8 shadow-xl shadow-slate-200/60">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Tech stack</p>
          <h3 className="text-3xl font-black text-slate-900">How the experience is engineered.</h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          <Sparkles size={14} /> React • Node • PostgreSQL
        </div>
      </header>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {techStack.map((tech) => (
          <article
            key={tech.title}
            className="flex gap-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <tech.icon size={18} />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">{tech.title}</h4>
              <p className="text-sm text-slate-600">{tech.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 shadow-xl shadow-slate-200/60">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Operating principles</p>
          <h3 className="text-2xl font-black text-slate-900">We design for energy, empathy, and execution.</h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          <Users2 size={16} /> Built for accountability partners
        </div>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {values.map((value) => (
          <article key={value.title} className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-sm">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <value.icon size={18} />
            </div>
            <h4 className="text-lg font-semibold text-slate-900">{value.title}</h4>
            <p className="mt-2 text-sm text-slate-600">{value.description}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="grid gap-8 rounded-[32px] border border-slate-100 bg-white/90 p-8 shadow-xl shadow-slate-200/60 lg:grid-cols-[1.2fr,0.8fr]">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">How we operate</p>
        <h3 className="text-3xl font-black text-slate-900">We promise calm transparency and bold iteration.</h3>
        <p className="text-base text-slate-600">
          The job hunt is already stressful. Our product decisions prioritize clarity: no dark patterns, no
          vanity metrics, just signal. Each week we audit commitments, drop blockers in standup, and decide
          what unlocks the next best story for our users.
        </p>
        <Link
          to="/job-feed"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Read the live job feed
        </Link>
      </div>
      <div className="space-y-4">
        {commitments.map((item) => (
          <div
            key={item.title}
            className="flex gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-sm"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900">
              <item.icon size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="rounded-[32px] border border-slate-900/20 bg-slate-900 p-8 text-white shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <h3 className="text-3xl font-black">Ready to make your job search feel like a launch?</h3>
          <p className="text-sm text-white/80">
            Spin up Job Ledger, log a win, send a thank-you, and keep the receipts organized. I built it for my
            own interviews—now it&apos;s yours.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/job-feed"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900"
          >
            Open the job feed <Rocket size={16} />
          </Link>
          <Link
            to="/applications"
            className="inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white"
          >
            Log an application <ClipboardList size={16} />
          </Link>
        </div>
      </div>
    </section>
  </div>
)

export const Route = createFileRoute('/about')({
  component: AboutPage,
})
