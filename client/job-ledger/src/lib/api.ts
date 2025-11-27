import {
  createSandboxApplication,
  deleteSandboxApplication,
  fetchSandboxApplications,
  isSandboxEnabled,
  updateSandboxApplication,
  updateSandboxApplicationStatus,
  resetSandboxApplications,
} from './sandboxApplications'
import { getAccessToken } from './authClient'
import type {
  ApplicationsQuery,
  ApplicationsResponse,
  CreateApplicationPayload,
  JobApplication,
  JobFeedResult,
  JobListing,
  UpdateApplicationPayload,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api'

const buildAuthHeaders = (): Record<string, string> => {
  const token = getAccessToken()
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    }
  }
  return {}
}

type CachedJobFeedResponse = {
  items: JobListing[]
  meta?: {
    page: number
    limit: number
    count: number
    sort?: string
  }
}

type LiveJobFeedResponse = {
  items: JobListing[]
}

type JobFeedQuery = {
  q?: string
  loc?: string
  page?: number
  limit?: number
  strategy?: 'cached' | 'live'
  remote?: boolean
  source?: string[]
  sort?: string
}

export async function fetchJobFeed(query: JobFeedQuery = {}): Promise<JobFeedResult> {
  const rawQuery = query.q?.trim()
  const rawLocation = query.loc?.trim()
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const strategy = query.strategy ?? 'cached'

  if (strategy === 'cached') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    })

    if (rawQuery) params.set('q', rawQuery)
    if (rawLocation) params.set('loc', rawLocation)
    if (query.remote === true) params.set('remote', 'true')
    if (query.remote === false) params.set('remote', 'false')
    if (query.source?.length) params.set('source', query.source.join(','))
    params.set('sort', query.sort ?? 'recent')

    const response = await fetch(`${API_BASE_URL}/jobs/cached?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Unable to load jobs right now.')
    }

    const data = (await response.json()) as CachedJobFeedResponse
    return {
      items: data.items ?? [],
      meta:
        data.meta ?? {
          page,
          limit,
          count: data.items?.length ?? 0,
          sort: query.sort ?? 'recent',
        },
    }
  }

  const params = new URLSearchParams({
    q: rawQuery || 'software engineer',
    loc: rawLocation || 'United States',
    page: String(page),
  })

  const response = await fetch(`${API_BASE_URL}/jobs/search?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Unable to load jobs right now.')
  }

  const data = (await response.json()) as LiveJobFeedResponse
  return {
    items: data.items ?? [],
    meta: { page, limit, count: data.items?.length ?? 0 },
  }
}

const CRON_SECRET = import.meta.env.VITE_CRON_SECRET?.trim()

export async function refreshJobCache() {
  const params = new URLSearchParams()
  if (CRON_SECRET) params.set('key', CRON_SECRET)

  const response = await fetch(
    `${API_BASE_URL}/jobs/refresh${params.toString() ? `?${params.toString()}` : ''}`,
  )

  if (!response.ok) {
    throw new Error('Unable to refresh jobs right now.')
  }

  const data = await response.json()
  return data
}

export async function fetchApplications(
  query: ApplicationsQuery = {}
): Promise<ApplicationsResponse> {
  const hasToken = Boolean(getAccessToken())
  const useSandbox = isSandboxEnabled() || !hasToken

  if (useSandbox) {
    const demoResponse = await fetchSandboxApplications(query)
    const meta = demoResponse.meta ?? {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      total: demoResponse.items.length,
    }
    return {
      items: demoResponse.items ?? [],
      meta: {
        ...meta,
        source: isSandboxEnabled() ? meta.source ?? 'sandbox' : 'demo',
        readOnly: false,
      },
    }
  }

  const params = new URLSearchParams()

  if (query.query?.trim()) params.set('query', query.query.trim())
  if (query.status) {
    const statusValue = Array.isArray(query.status)
      ? query.status.join(',')
      : query.status
    if (statusValue.trim()) params.set('status', statusValue)
  }
  if (query.appliedAfter) params.set('appliedAfter', query.appliedAfter)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.userId) params.set('userId', query.userId)
  if (query.sort) params.set('sort', query.sort)

  if (!params.has('page')) params.set('page', String(query.page ?? 1))
  if (!params.has('limit')) params.set('limit', String(query.limit ?? 20))

  const requestedPage = Number(params.get('page')) || 1
  const requestedLimit = Number(params.get('limit')) || 20
  type ApplicationsMeta = NonNullable<ApplicationsResponse['meta']>
  const buildFallbackMeta = (total: number): ApplicationsMeta => ({
    page: requestedPage,
    limit: requestedLimit,
    total,
  })

  const fallbackToDemoApplications = async (): Promise<ApplicationsResponse> => {
    const demoResponse = await fetchSandboxApplications(query)
    const meta = demoResponse.meta ?? buildFallbackMeta(demoResponse.items.length)
    return {
      items: demoResponse.items ?? [],
      meta: {
        ...meta,
        source: meta.source ?? 'demo',
        readOnly: false,
      },
    }
  }

  const search = params.toString()
  const headers = buildAuthHeaders()
  const response = await fetch(
    `${API_BASE_URL}/applications${search ? `?${search}` : ''}`,
    {
      headers,
    }
  )

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return fallbackToDemoApplications()
    }
    throw new Error('Unable to load applications right now.')
  }

  const data = (await response.json()) as ApplicationsResponse
  const responseMeta = data.meta ?? buildFallbackMeta(data.items?.length ?? 0)

  return {
    items: data.items ?? [],
    meta: {
      ...responseMeta,
      source: responseMeta.source ?? 'api',
      readOnly: responseMeta.readOnly ?? false,
    },
  }
}

export async function createApplication(
  payload: CreateApplicationPayload,
): Promise<JobApplication> {
  if (isSandboxEnabled() || !getAccessToken()) {
    return createSandboxApplication(payload)
  }

  const response = await fetch(`${API_BASE_URL}/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message =
      (await response.json().catch(() => null))?.error ??
      'Unable to create application right now.'
    throw new Error(message)
  }

  return (await response.json()) as JobApplication
}

export async function updateApplicationStatus(
  id: string,
  status: JobApplication['status'],
): Promise<JobApplication> {
  if (isSandboxEnabled() || !getAccessToken()) {
    return updateSandboxApplicationStatus(id, status)
  }

  const response = await fetch(`${API_BASE_URL}/applications/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const message =
      (await response.json().catch(() => null))?.error ??
      'Unable to update application right now.'
    throw new Error(message)
  }

  return (await response.json()) as JobApplication
}

export async function updateApplication(
  id: string,
  payload: UpdateApplicationPayload,
): Promise<JobApplication> {
  if (isSandboxEnabled() || !getAccessToken()) {
    return updateSandboxApplication(id, payload)
  }

  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message =
      (await response.json().catch(() => null))?.error ??
      'Unable to update application right now.'
    throw new Error(message)
  }

  return (await response.json()) as JobApplication
}

export async function deleteApplication(id: string): Promise<void> {
  if (isSandboxEnabled() || !getAccessToken()) {
    return deleteSandboxApplication(id)
  }

  const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
    method: 'DELETE',
    headers: {
      ...buildAuthHeaders(),
    },
  })

  if (!response.ok) {
    const message =
      (await response.json().catch(() => null))?.error ??
      'Unable to delete application right now.'
    throw new Error(message)
  }
}

export async function resetDemoApplications(): Promise<JobApplication[]> {
  if (isSandboxEnabled() || !getAccessToken()) {
    return resetSandboxApplications()
  }
  throw new Error('Reset is only available in demo mode.')
}

export { getSandboxRandomAppliedDate, getSandboxRandomStatus, isSandboxEnabled } from './sandboxApplications'
export type {
  ApplicationsQuery,
  ApplicationsResponse,
  CreateApplicationPayload,
  JobApplication,
  JobFeedResult,
  JobListing,
  UpdateApplicationPayload,
} from './types'
