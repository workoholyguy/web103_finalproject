import { createFileRoute } from '@tanstack/react-router'
import { Lock, LogOut, Mail, PenSquare, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
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
  const { user, status, initializing, signUp, signIn, signOut, updateProfile, updateEmail, updatePassword } =
    useAuth()
  const [signupMessage, setSignupMessage] = useState<string | null>(null)
  const [signupStatus, setSignupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [signinMessage, setSigninMessage] = useState<string | null>(null)
  const [signinStatus, setSigninStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    timezone: '',
    avatarUrl: '',
  })
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [emailForm, setEmailForm] = useState({ email: '', password: '' })
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  })
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  useEffect(() => {
    setProfileForm({
      displayName: user?.displayName ?? '',
      timezone: user?.timezone ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    })
    setProfileStatus('idle')
    setProfileMessage(null)
    setEmailForm((prev) => ({
      ...prev,
      email: user?.email ?? '',
    }))
    setEmailStatus('idle')
    setEmailMessage(null)
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
    })
    setPasswordStatus('idle')
    setPasswordMessage(null)
  }, [user])

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

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!signedIn) {
      setProfileStatus('error')
      setProfileMessage('Sign in to update your profile.')
      return
    }
    setProfileStatus('loading')
    setProfileMessage('Saving your profile…')
    try {
      await updateProfile({
        displayName: profileForm.displayName.trim() || null,
        timezone: profileForm.timezone.trim() || null,
        avatarUrl: profileForm.avatarUrl.trim() || null,
      })
      setProfileStatus('success')
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      setProfileStatus('error')
      setProfileMessage(
        error instanceof Error ? error.message : 'Unable to update your profile right now.',
      )
    }
  }

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setEmailForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!signedIn) {
      setEmailStatus('error')
      setEmailMessage('Sign in to change your email address.')
      return
    }
    const email = emailForm.email.trim()
    const password = emailForm.password
    if (!email || !password) {
      setEmailStatus('error')
      setEmailMessage('Email and password are required.')
      return
    }
    setEmailStatus('loading')
    setEmailMessage('Updating email…')
    try {
      await updateEmail({ email, password })
      setEmailStatus('success')
      setEmailMessage('Email updated successfully.')
      setEmailForm((prev) => ({ ...prev, password: '' }))
    } catch (error) {
      setEmailStatus('error')
      setEmailMessage(
        error instanceof Error ? error.message : 'Unable to update your email right now.',
      )
    }
  }

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!signedIn) {
      setPasswordStatus('error')
      setPasswordMessage('Sign in to change your password.')
      return
    }
    const { currentPassword, newPassword } = passwordForm
    if (!currentPassword || !newPassword) {
      setPasswordStatus('error')
      setPasswordMessage('Both current and new passwords are required.')
      return
    }
    setPasswordStatus('loading')
    setPasswordMessage('Updating password…')
    try {
      await updatePassword({ currentPassword, newPassword })
      setPasswordStatus('success')
      setPasswordMessage('Password updated successfully.')
      setPasswordForm({ currentPassword: '', newPassword: '' })
    } catch (error) {
      setPasswordStatus('error')
      setPasswordMessage(
        error instanceof Error ? error.message : 'Unable to update your password right now.',
      )
    }
  }

  const isBusy =
    initializing ||
    status === 'loading' ||
    signupStatus === 'loading' ||
    signinStatus === 'loading'
  const signedIn = Boolean(user)
  const profileDisabled = !signedIn || profileStatus === 'loading' || initializing || status === 'loading'
  const emailDisabled = !signedIn || emailStatus === 'loading' || initializing || status === 'loading'
  const passwordDisabled =
    !signedIn || passwordStatus === 'loading' || initializing || status === 'loading'

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]">
            <Lock size={14} /> Account security
          </p>
          <h1 className="text-4xl font-black">
            Keep your job-search workspace secure with email-and-password access.
          </h1>
          <p className="text-sm text-white/80">
            Create an account to sync applications across devices, or sign back in to continue where
            you left off. Sessions refresh automatically so your tracker stays private and seamless.
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
        <div className="rounded-[28px] border border-slate-100 bg-white/95 p-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-center gap-3 text-slate-900">
            <PenSquare size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Profile</p>
              <h3 className="text-xl font-semibold">Update your basic info</h3>
            </div>
          </div>
          {signedIn ? (
            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
              <label className="text-sm font-semibold text-slate-600">
                Display name
                <input
                  name="displayName"
                  value={profileForm.displayName}
                  onChange={handleProfileChange}
                  disabled={profileDisabled}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                Timezone
                <input
                  name="timezone"
                  value={profileForm.timezone}
                  onChange={handleProfileChange}
                  placeholder="e.g. America/Los_Angeles"
                  disabled={profileDisabled}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>
              <label className="text-sm font-semibold text-slate-600">
                Avatar URL
                <input
                  name="avatarUrl"
                  value={profileForm.avatarUrl}
                  onChange={handleProfileChange}
                  placeholder="https://"
                  disabled={profileDisabled}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>
              {profileMessage ? (
                <p
                  className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${messageClasses(profileStatus)}`}
                >
                  {profileMessage}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={profileDisabled}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {profileStatus === 'loading' ? 'Saving…' : 'Save profile'}
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-slate-600">
              Sign in to edit your profile details and sync them across devices.
            </p>
          )}
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-center gap-3 text-slate-900">
            <Mail size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Update email</p>
              <h3 className="text-xl font-semibold">Change account email</h3>
            </div>
          </div>
          <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
            <label className="text-sm font-semibold text-slate-600">
              New email
              <input
                name="email"
                type="email"
                value={emailForm.email}
                onChange={handleEmailChange}
                disabled={emailDisabled}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Current password
              <input
                name="password"
                type="password"
                value={emailForm.password}
                onChange={handleEmailChange}
                disabled={emailDisabled}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
            {emailMessage ? (
              <p
                className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${messageClasses(emailStatus)}`}
              >
                {emailMessage}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={emailDisabled}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {emailStatus === 'loading' ? 'Updating…' : 'Update email'}
            </button>
          </form>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white/90 p-6 shadow-lg shadow-slate-200/60">
          <div className="flex items-center gap-3 text-slate-900">
            <Lock size={20} />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Update password</p>
              <h3 className="text-xl font-semibold">Keep your account secure</h3>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <label className="text-sm font-semibold text-slate-600">
              Current password
              <input
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                disabled={passwordDisabled}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              New password
              <input
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                disabled={passwordDisabled}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-sky-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
            {passwordMessage ? (
              <p
                className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${messageClasses(passwordStatus)}`}
              >
                {passwordMessage}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={passwordDisabled}
              className="w-full rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordStatus === 'loading' ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/account')({
  component: AccountPage,
})
