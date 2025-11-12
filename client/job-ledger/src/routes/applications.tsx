import { createFileRoute } from '@tanstack/react-router'

import { ApplicationsBoard } from '../components/ApplicationsBoard'

const ApplicationsPage = () => (
  <main className="bg-slate-50 min-h-screen">
    <ApplicationsBoard />
  </main>
)

export const Route = createFileRoute('/applications')({
  component: ApplicationsPage,
})
