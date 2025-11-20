import { createFileRoute } from '@tanstack/react-router'
import { Lock, LogOut, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/authContext'

const FormField = ({
  label,
  type = 'text',
  name,
  placeholder,
  required = false,
  autoComplete,
  disabled = false,
}: {
  label: string
  type?: string
  name: string
  placeholder?: string
  required?: boolean
  autoComplete?: string
  disabled?: boolean
}) => (
  <label className="text-sm font-semibold text-slate-600">
    {label}
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
    />
  </label>
)

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const messageClasses = (status: 'idle' | 'loading' | 'success' | 'error') => {
  if (status === 'error') return 'border-red-200 bg-red-50 text-red-700'
  if (status === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-slate-200 bg-slate-900/5 text-slate-600'
}

const AccountPage = () => {
  const { user, status, initializing, signUp, signIn, signOut } = useAuth()
  const [signupMessage, setSignupMessage] = useState<string | null>(null)
  const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [signinMessage, setSigninMessage] = useState<string | null>(null)
  const [signinStatus, setSigninStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const displayName = String(formData.get('fullName') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!email || !password) {
      setSignupStatus('error')
      setSignupMessage('Email and password are required.')
      return
    }

    setSignupStatus('loading')
    setSignupMessage('Creating your account…')
    try {
      await signUp({ email, password, displayName: displayName || undefined })
      setSignupStatus('success')
      setSignupMessage('Welcome aboard! You are now signed in.')
      form.reset()
    } catch (error) {
      setSignupStatus('error')
      setSignupMessage(
        error instanceof Error ? error.message : 'Unable to create your account right now.',
      )
    }
  }

  const handleSignin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const email = String(formData.get('loginEmail') ?? '').trim()
    const password = String(formData.get('loginPassword') ?? '')

    if (!email || !password) {
      setSigninStatus('error')
      setSigninMessage('Email and password are required.')
      return
    }

    setSigninStatus('loading')
    setSigninMessage('Verifying your credentials…')
    try {
      await signIn({ email, password })
      setSigninStatus('success')
      setSigninMessage('Signed in successfully — hop over to the tracker.')
      form.reset()
    } catch (error) {
      setSigninStatus('error')
      setSigninMessage(
        error instanceof Error ? error.message : 'Unable to sign in with those credentials.',
      )
    }
  }

  const isBusy =
    initializing ||
    status === 'loading' ||
    signupStatus === 'loading' ||
    signinStatus === 'loading'
  const signedIn = Boolean(user)

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]">
            <Lock size={14} /> Account security
          </p>
          <h1 className="text-4xl font-black">
            Authentication now lands in Express + Postgres with hashed passwords and JWT sessions.
          </h1>
          <p className="text-sm text-white/80">
            Sign up to create a UUID-scoped user row, or sign in to resume your workspace. Every
            request to the applications API now expects a bearer token so your data never mingles
            with other hunters.
          </p>
          {initializing ? (
            <p className="text-xs text-white/70">Checking your existing session…</p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[28px] border border-slate-100 bg-white/95 p-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-center gap-3 text-slate-900">
            <ShieldCheck size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Session</p>
              <h3 className="text-xl font-semibold">
                {signedIn ? 'You are signed in' : 'Guest session active'}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {signedIn
              ? 'Every tracker, note, and stage you touch routes through this identity. Tokens refresh automatically while you keep working.'
              : 'Create an account or log in to sync applications to Postgres instead of the local sandbox.'}
          </p>

          {signedIn ? (
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <dt className="text-slate-500">Display name</dt>
                <dd className="font-semibold text-slate-900">{user?.displayName ?? '—'}</dd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-semibold text-slate-900">{user?.email}</dd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <dt className="text-slate-500">Timezone</dt>
                <dd className="font-semibold text-slate-900">
                  {user?.timezone ?? 'Set inside account later'}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <dt className="text-slate-500">Last login</dt>
                <dd className="font-semibold text-slate-900">
                  {formatDate(user?.lastLoginAt ?? user?.createdAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Create an account to unlock persistent pipelines.</li>
              <li>Sessions expire after 30 days or instantly when you log out.</li>
              <li>We hash passwords with bcrypt and verify over HTTPS.</li>
            </ul>
          )}

          <button
            type="button"
            disabled={!signedIn || isBusy}
            onClick={() => signOut()}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={handleSignup}
          className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/60"
        >
          <div className="flex items-center gap-3 text-slate-900">
            <UserPlus size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Sign up</p>
              <h3 className="text-xl font-semibold">Create a Job Ledger account</h3>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <FormField
              label="Full name"
              name="fullName"
              placeholder="Omar Madjiov"
              autoComplete="name"
              disabled={isBusy}
            />
            <FormField
              label="Email"
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isBusy}
            />
            <FormField
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              disabled={isBusy}
            />
          </div>
          {signupMessage ? (
            <p
              className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold ${messageClasses(signupStatus)}`}
            >
              {signupMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            {signupStatus === 'loading' ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <form
          onSubmit={handleSignin}
          className="rounded-[28px] border border-slate-100 bg-white/80 p-6 shadow-lg shadow-slate-200/60"
        >
          <div className="flex items-center gap-3 text-slate-900">
            <Mail size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Sign in</p>
              <h3 className="text-xl font-semibold">Return to your tracker</h3>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <FormField
              label="Email"
              type="email"
              name="loginEmail"
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isBusy}
            />
            <FormField
              label="Password"
              type="password"
              name="loginPassword"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isBusy}
            />
          </div>
          {signinMessage ? (
            <p
              className={`mt-4 rounded-2xl border px-4 py-3 text-xs font-semibold ${messageClasses(signinStatus)}`}
            >
              {signinMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isBusy}
            className="mt-6 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signinStatus === 'loading' ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Forgot password? Reset flows plug into the `password_reset_tokens` table next.
          </p>
        </form>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/account')({
  component: AccountPage,
})
