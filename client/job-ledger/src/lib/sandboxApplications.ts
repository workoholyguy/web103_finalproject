import type {
  ApplicationsQuery,
  ApplicationsResponse,
  CreateApplicationPayload,
  JobApplication,
  UpdateApplicationPayload,
} from './types'
import { SANDBOX_SEED_APPLICATIONS } from './demoApplications'

const SANDBOX_MODE = (import.meta.env.VITE_APPLICATIONS_SANDBOX ?? 'sandbox').toLowerCase()
const SANDBOX_ENABLED = SANDBOX_MODE !== 'off'

const STORAGE_KEY = 'job-ledger:sandbox:applications:v1'
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20

const STATUS_WEIGHTS: Array<{ value: JobApplication['status']; weight: number }> = [
  { value: 'planned', weight: 2 },
  { value: 'applied', weight: 3 },
  { value: 'interviewing', weight: 2 },
  { value: 'offer', weight: 1 },
  { value: 'rejected', weight: 1 },
]

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

let cache: JobApplication[] | null = null

const cloneApplications = (apps: JobApplication[]) => apps.map((app) => ({ ...app }))

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const randomDaysAgo = (maxDays = 60) => {
  const days = randomBetween(1, maxDays)
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

const randomStatus = () => {
  const totalWeight = STATUS_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0)
  let pick = Math.random() * totalWeight
  for (const entry of STATUS_WEIGHTS) {
    if (pick < entry.weight) {
      return entry.value
    }
    pick -= entry.weight
  }
  return 'planned'
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sandbox-${crypto.randomUUID()}`
  }
  return `sandbox-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const readFromStorage = (): JobApplication[] | null => {
  if (!isBrowser) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as JobApplication[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const persistToStorage = (apps: JobApplication[]) => {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))
  } catch {
    // ignore quota errors
  }
}

const hydrateSeedApplications = () => {
  return SANDBOX_SEED_APPLICATIONS.map((application) => ({
    ...application,
    id: application.id ?? generateId(),
    status: application.status ?? randomStatus(),
    appliedAt: application.appliedAt ?? randomDaysAgo(75),
    createdAt: application.appliedAt ?? randomDaysAgo(90),
  }))
}

const ensureCache = () => {
  if (cache) return cache
  const stored = readFromStorage()
  if (stored && stored.length) {
    cache = cloneApplications(stored)
    return cache
  }
  const seeded = hydrateSeedApplications()
  cache = cloneApplications(seeded)
  persistToStorage(cache)
  return cache
}

const writeCache = (apps: JobApplication[]) => {
  cache = cloneApplications(apps)
  persistToStorage(cache)
}

const normalizeStatuses = (status?: string | string[]) => {
  if (!status) return []
  if (Array.isArray(status)) {
    return status
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry && entry !== 'all')
  }
  return status
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry && entry !== 'all')
}

const matchesQuery = (application: JobApplication, text?: string) => {
  if (!text?.trim()) return true
  const haystack = [
    application.company,
    application.title,
    application.notes,
    application.location,
    application.source,
  ]
    .map((value) => (value ?? '').toLowerCase())
    .join(' ')
  return haystack.includes(text.trim().toLowerCase())
}

const appliedAtTimestamp = (value?: string | null) => {
  if (!value) return 0
  const ts = Date.parse(value)
  return Number.isNaN(ts) ? 0 : ts
}

const createdAtTimestamp = (application: JobApplication) => {
  if (application.createdAt) {
    const ts = Date.parse(application.createdAt)
    if (!Number.isNaN(ts)) return ts
  }
  return appliedAtTimestamp(application.appliedAt)
}

const sortApplications = (apps: JobApplication[], sort?: string) => {
  const normalized = (sort ?? 'applied_desc').toLowerCase()
  return [...apps].sort((a, b) => {
    switch (normalized) {
      case 'applied_asc':
        return appliedAtTimestamp(a.appliedAt) - appliedAtTimestamp(b.appliedAt)
      case 'created_desc':
        return createdAtTimestamp(b) - createdAtTimestamp(a)
      case 'created_asc':
        return createdAtTimestamp(a) - createdAtTimestamp(b)
      case 'company_asc':
        return (a.company || '').localeCompare(b.company || '')
      case 'company_desc':
        return (b.company || '').localeCompare(a.company || '')
      case 'title_asc':
        return (a.title || '').localeCompare(b.title || '')
      case 'title_desc':
        return (b.title || '').localeCompare(a.title || '')
      case 'applied_desc':
      default:
        return appliedAtTimestamp(b.appliedAt) - appliedAtTimestamp(a.appliedAt)
    }
  })
}

const paginate = <T,>(items: T[], page: number, limit: number) => {
  const start = (page - 1) * limit
  return items.slice(start, start + limit)
}

export const isSandboxEnabled = () => SANDBOX_ENABLED

export const getSandboxRandomStatus = () => randomStatus()

export const getSandboxRandomAppliedDate = () => randomDaysAgo(45)

export const fetchSandboxApplications = async (
  query: ApplicationsQuery = {},
): Promise<ApplicationsResponse> => {
  const apps = ensureCache()
  const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE
  const limit = query.limit && query.limit > 0 ? query.limit : DEFAULT_LIMIT
  const statuses = normalizeStatuses(query.status)
  const appliedAfterTs = query.appliedAfter ? Date.parse(query.appliedAfter) : null

  const filtered = apps.filter((application) => {
    const matchesStatus =
      !statuses.length || statuses.includes(application.status?.toLowerCase() ?? '')
    const matchesApplied =
      !appliedAfterTs || (application.appliedAt ? Date.parse(application.appliedAt) >= appliedAfterTs : false)
    return matchesStatus && matchesApplied && matchesQuery(application, query.query)
  })

  const sorted = sortApplications(filtered, query.sort)
  const paged = paginate(sorted, page, limit)

  return {
    items: cloneApplications(paged),
    meta: {
      page,
      limit,
      total: filtered.length,
    },
  }
}

export const createSandboxApplication = async (
  payload: CreateApplicationPayload,
): Promise<JobApplication> => {
  const apps = ensureCache()
  const nowIso = new Date().toISOString()
  const application: JobApplication = {
    id: generateId(),
    title: payload.title,
    company: payload.company,
    status: payload.status ?? 'planned',
    appliedAt: payload.appliedAt ?? nowIso,
    location: payload.location,
    remote: payload.remote,
    source: payload.source ?? 'manual',
    jobPostUrl: payload.jobPostUrl,
    notes: payload.notes,
    createdAt: nowIso,
  }
  const updated = [application, ...apps]
  writeCache(updated)
  return { ...application }
}

export const updateSandboxApplicationStatus = async (
  id: string,
  status: JobApplication['status'],
): Promise<JobApplication> => {
  const apps = ensureCache()
  const index = apps.findIndex((application) => application.id === id)
  if (index === -1) {
    throw new Error('Application not found in sandbox')
  }
  const updatedApplication: JobApplication = {
    ...apps[index],
    status,
  }
  const updated = [...apps]
  updated[index] = updatedApplication
  writeCache(updated)
  return { ...updatedApplication }
}

export const updateSandboxApplication = async (
  id: string,
  payload: UpdateApplicationPayload,
): Promise<JobApplication> => {
  const apps = ensureCache()
  const index = apps.findIndex((application) => application.id === id)
  if (index === -1) {
    throw new Error('Application not found in sandbox')
  }
  const updatedApplication: JobApplication = {
    ...apps[index],
    title: payload.title,
    company: payload.company,
    status: payload.status,
    appliedAt: payload.appliedAt ?? apps[index].appliedAt,
    jobPostUrl: payload.jobPostUrl ?? apps[index].jobPostUrl,
    source: payload.source ?? apps[index].source,
    notes: payload.notes ?? apps[index].notes,
    location: payload.location ?? apps[index].location,
    remote: typeof payload.remote === 'boolean' ? payload.remote : apps[index].remote,
  }
  const updated = [...apps]
  updated[index] = updatedApplication
  writeCache(updated)
  return { ...updatedApplication }
}

export const deleteSandboxApplication = async (id: string): Promise<void> => {
  const apps = ensureCache()
  const updated = apps.filter((application) => application.id !== id)
  writeCache(updated)
}
