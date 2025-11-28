import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

const LOGO_ASSET = '/Zoom_brilliant_logo.png'

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Job Feed', to: '/job-feed' },
  { label: 'Applications', to: '/applications' },
  { label: 'Account', to: '/account' },
  { label: 'About', to: '/about' },
]

const MobileNav = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) => (
  <div
    className={`fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-md transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    onClick={onClose}
  >
    <nav
      className={`absolute top-0 left-0 h-full w-80 transform bg-slate-950 px-6 py-10 shadow-2xl transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-white">
          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1 shadow-inner shadow-white/20">
            <img
              src={LOGO_ASSET}
              alt="Job Ledger logo"
              className="h-full w-full rounded-xl object-contain"
              width={48}
              height={48}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Job Ledger</p>
            <p className="text-lg font-semibold">Career OS</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/20 p-2 text-white transition hover:bg-white/10"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      <ul className="mt-10 space-y-2 text-lg font-semibold text-slate-100">
        {NAV_LINKS.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              onClick={onClose}
              className="flex items-center justify-between rounded-2xl border border-white/5 px-4 py-3 transition hover:border-white/20 hover:bg-white/5"
              activeProps={{
                className:
                  'flex items-center justify-between rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3 text-white',
              }}
            >
              {link.label}
              <span className="text-xs uppercase tracking-wide text-slate-400">view</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </div>
)

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-1 shadow-inner shadow-cyan-500/20">
              <img
                src={LOGO_ASSET}
                alt="Job Ledger logo"
                className="h-full w-full rounded-xl object-contain"
                width={84}
                height={84}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-slate-400">Job Ledger</p>
              <p className="text-base font-semibold">Strategy Studio</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-2 py-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-white"
                activeProps={{
                  className:
                    'rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/10',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/job-feed"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
            >
              Browse feed
            </Link>
            <Link
              to="/applications"
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:scale-[1.01]"
            >
              Launch tracker
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 text-white transition hover:border-white/40 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <MobileNav isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
