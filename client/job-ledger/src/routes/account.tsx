import { createFileRoute } from '@tanstack/react-router'
import { Lock, Mail, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'

const FormField = ({
  label,
  type = 'text',
  name,
  placeholder,
}: {
  label: string
  type?: string
  name: string
  placeholder?: string
}) => (
  <label className="text-sm font-semibold text-slate-600">
    {label}
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-sky-400"
    />
  </label>
)

const placeholderSubmit = (setter: (value: string) => void) => (event: FormEvent) => {
  event.preventDefault()
  setter('Forms are wired visually. Hook into Supabase or custom auth later.')
}

const AccountPage = () => {
  const [signupNote, setSignupNote] = useState('')
  const [signinNote, setSigninNote] = useState('')

  return (
    <div className="space-y-10">
      <section className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 text-white shadow-2xl">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]">
            <Lock size={14} /> Account preview
          </p>
          <h1 className="text-4xl font-black">
            Authentication comes later, but the forms already match our cinematic brand.
          </h1>
          <p className="text-sm text-white/80">
            We do not gate anything yet — this dummy page is here so Supabase or custom JWT flows can
            drop in with minimal styling work in future milestones.
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={placeholderSubmit(setSignupNote)}
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
            <FormField label="Full name" name="fullName" placeholder="Omar Madjiov" />
            <FormField label="Email" type="email" name="email" placeholder="you@example.com" />
            <FormField label="Password" type="password" name="password" placeholder="••••••••" />
          </div>
          {signupNote ? (
            <p className="mt-4 rounded-2xl bg-slate-900/5 px-4 py-3 text-xs font-semibold text-slate-600">
              {signupNote}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200"
          >
            Sign up
          </button>
        </form>

        <form
          onSubmit={placeholderSubmit(setSigninNote)}
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
            <FormField label="Email" type="email" name="loginEmail" placeholder="you@example.com" />
            <FormField label="Password" type="password" name="loginPassword" placeholder="••••••••" />
          </div>
          {signinNote ? (
            <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-700">
              {signinNote}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-6 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Sign in
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Forgot password? Add reset flows after auth integration.
          </p>
        </form>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/account')({
  component: AccountPage,
})
