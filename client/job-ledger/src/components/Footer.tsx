import { Link } from '@tanstack/react-router'

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Job Feed', to: '/job-feed' },
  { label: 'Applications', to: '/applications' },
  { label: 'Account', to: '/account' },
  { label: 'About', to: '/about' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 bg-slate-950 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[2fr,1fr,1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 text-xl font-extrabold text-white shadow-lg">
              JL
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-slate-400">Job Ledger</p>
              <p className="text-lg font-semibold">Career OS</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            We craft focused job-search rituals that feel like a modern product launch. Track leads,
            nurture relationships, and celebrate every milestone inside one calm interface.
          </p>
          <p className="text-xs text-slate-500">Operating out of imagination &amp; execution labs.</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Navigate
          </h4>
          <nav className="mt-4 space-y-3 text-sm">
            {footerLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block text-slate-300 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Contact
          </h4>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>Omar Madjiov &amp; team</p>
            <p>hello@jobledger.app</p>
            <p>Building during CodePath WEB103</p>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-900/70 px-4 py-6 text-center text-xs text-slate-500">
        © {year} Job Ledger. Crafted for ambitious applicants with experimental energy.
      </div>
    </footer>
  )
}
