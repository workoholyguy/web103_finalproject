const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api'

export type JobListing = {
  externalId: string
  title: string
  company: string
  location?: string
  remote?: boolean
  url: string
  source: string
  description?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
  postedAt?: string
  tags?: string[]
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

export type JobFeedResult = {
  items: JobListing[]
  meta?: {
    page: number
    limit: number
    count: number
    sort?: string
  }
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

export type JobApplication = {
  id: string
  title: string
  company: string
  status: string
  stage?: string
  appliedAt?: string
  responseAt?: string
  location?: string
  remote?: boolean
  source?: string
  jobPostUrl?: string
  notes?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
}

type ApplicationsResponse = {
  items: JobApplication[]
  meta?: {
    page: number
    limit: number
    total: number
  }
}

export type ApplicationsQuery = {
  query?: string
  status?: string | string[]
  appliedAfter?: string
  page?: number
  limit?: number
  userId?: string
}

export async function fetchApplications(
  query: ApplicationsQuery = {}
): Promise<ApplicationsResponse> {
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

  if (!params.has('page')) params.set('page', String(query.page ?? 1))
  if (!params.has('limit')) params.set('limit', String(query.limit ?? 20))

  const search = params.toString()
  const response = await fetch(
    `${API_BASE_URL}/applications${search ? `?${search}` : ''}`
  )

  if (!response.ok) {
    throw new Error('Unable to load applications right now.')
  }

  const data = (await response.json()) as ApplicationsResponse
  const fallbackMeta = {
    page: Number(params.get('page')) || 1,
    limit: Number(params.get('limit')) || 20,
    total: data.items?.length ?? 0,
  }

  return {
    items: data.items ?? [],
    meta: data.meta ?? fallbackMeta,
  }
}
