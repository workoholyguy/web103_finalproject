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

export type JobFeedResult = {
  items: JobListing[]
  meta?: {
    page: number
    limit: number
    count: number
    sort?: string
  }
}

export type JobApplication = {
  id: string
  title: string
  company: string
  status: string
  stage?: string
  appliedAt?: string | null
  responseAt?: string | null
  createdAt?: string
  location?: string
  remote?: boolean
  source?: string
  jobPostUrl?: string
  notes?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
}

export type CreateApplicationPayload = {
  title: string
  company: string
  status: JobApplication['status']
  appliedAt?: string
  jobPostUrl?: string
  notes?: string
  source?: string
  location?: string
  remote?: boolean
  userId?: string
}

export type UpdateApplicationPayload = {
  title: string
  company: string
  status: JobApplication['status']
  appliedAt?: string
  jobPostUrl?: string
  notes?: string
  source?: string
  location?: string
  remote?: boolean
}

export type ApplicationsResponse = {
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
  sort?: string
}

export type AuthUser = {
  id: string
  email: string
  displayName?: string | null
  avatarUrl?: string | null
  timezone?: string | null
  emailVerifiedAt?: string | null
  lastLoginAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}
