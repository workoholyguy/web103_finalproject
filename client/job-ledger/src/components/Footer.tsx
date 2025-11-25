import { Link } from '@tanstack/react-router'
import { Github, Linkedin, Mail, Phone } from 'lucide-react'

const footerLinks = [
  { label: 'Home', to: '/' },
  { label: 'Job Feed', to: '/job-feed' },
  { label: 'Applications', to: '/applications' },
  { label: 'Account', to: '/account' },
  { label: 'About', to: '/about' },
]

const LOGO_ASSET = '/logo5121.png'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-24 bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-16">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-1 shadow-inner shadow-cyan-500/20">
              <img
                src={LOGO_ASSET}
                alt="Job Ledger logo"
                className="h-full w-full rounded-xl object-contain"
                width={48}
                height={48}
              />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-slate-400">Job Ledger</p>
              <p className="text-lg font-semibold">Career OS</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Built by Omar Madjitov as a calm, cinematic ritual for tracking every outreach, follow-up, and
            win. Keep your job-search telemetry tight so decisions feel confident, not chaotic.
          </p>
        </div>

        <div className="flex flex-col gap-10 border-t border-white/5 pt-8 text-sm sm:flex-row sm:justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Navigate
            </h4>
            <nav className="mt-4 flex flex-wrap gap-4 text-slate-300">
              {footerLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Contact
            </h4>
            <div className="mt-4 space-y-2 text-slate-300">
              <p className="font-semibold text-white">Omar Madjitov</p>
              <a href="tel:+14043967397" className="flex items-center gap-2 hover:text-white">
                <Phone size={14} className="text-slate-400" />
                <span>(404) 396-7397</span>
              </a>
              <a href="mailto:avidtechusa@gmail.com" className="flex items-center gap-2 hover:text-white">
                <Mail size={14} className="text-slate-400" />
                <span>avidtechusa@gmail.com</span>
              </a>
              <a
                href="https://github.com/workoholyguy"
                className="flex items-center gap-2 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                <Github size={14} className="text-slate-400" />
                <span>github.com/workoholyguy</span>
              </a>
              <a
                href="https://www.linkedin.com/in/omar-madjitov/"
                className="flex items-center gap-2 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                <Linkedin size={14} className="text-slate-400" />
                <span>linkedin.com/in/omar-madjitov</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-900/70 px-4 py-6 text-center text-xs text-slate-500">
        © {year} Job Ledger. Crafted for ambitious applicants with experimental energy.{' '}
        <a
          href="https://avidtechusa.com/"
          target="_blank"
          rel="noreferrer"
          className="text-slate-200 underline decoration-slate-500 decoration-dotted"
        >
          Powered by Avid Tech USA
        </a>
        .
      </div>
    </footer>
  )
}
