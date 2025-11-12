import { createFileRoute } from '@tanstack/react-router'
import { JobFeed } from '../components/JobFeed'

export const Route = createFileRoute('/')({
  component: JobFeed,
})
