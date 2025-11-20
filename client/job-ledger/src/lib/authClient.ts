import type { AuthUser } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api'
const AUTH_STORAGE_KEY = 'job-ledger:auth:v1'
const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export type AuthResponse = {
  user: AuthUser
  accessToken: string
  refreshToken: string
  expiresAt?: string
}

type StoredAuth = AuthResponse | null

const readResponseBody = async (response: Response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const handleAuthResponse = async (response: Response): Promise<AuthResponse> => {
  const data = await readResponseBody(response)
  if (!response.ok || !data) {
    throw new Error(data?.error ?? 'Unable to complete authentication request.')
  }
  return data as AuthResponse
}

export const getStoredAuth = (): StoredAuth => {
  if (!isBrowser) return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuth
    if (!parsed?.accessToken || !parsed?.refreshToken) return null
    return parsed
  } catch {
    return null
  }
}

export const persistAuth = (payload: StoredAuth) => {
  if (!isBrowser) return
  if (!payload) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

export const clearAuthStorage = () => persistAuth(null)

export const getAccessToken = () => getStoredAuth()?.accessToken ?? null

export const getRefreshToken = () => getStoredAuth()?.refreshToken ?? null

export const registerAccount = async (payload: {
  email: string
  password: string
  displayName?: string
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return handleAuthResponse(response)
}

export const loginAccount = async (payload: {
  email: string
  password: string
}): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return handleAuthResponse(response)
}

export const refreshSession = async (refreshToken: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  return handleAuthResponse(response)
}

export const logoutSession = async (refreshToken: string) => {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined)
}

export const fetchCurrentUser = async (accessToken: string): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await readResponseBody(response)
  if (!response.ok || !data?.user) {
    throw new Error(data?.error ?? 'Unable to load account details.')
  }

  return data.user as AuthUser
}

export type UpdateProfilePayload = {
  displayName?: string | null
  avatarUrl?: string | null
  timezone?: string | null
}

export const updateProfile = async (
  accessToken: string,
  payload: UpdateProfilePayload,
): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await readResponseBody(response)
  if (!response.ok || !data?.user) {
    throw new Error(data?.error ?? 'Unable to update profile right now.')
  }

  return data.user as AuthUser
}

export const updateEmail = async (
  accessToken: string,
  payload: { email: string; password: string },
): Promise<AuthUser> => {
  const response = await fetch(`${API_BASE_URL}/auth/email`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await readResponseBody(response)
  if (!response.ok || !data?.user) {
    throw new Error(data?.error ?? 'Unable to update email right now.')
  }

  return data.user as AuthUser
}

export const updatePassword = async (
  accessToken: string,
  payload: { currentPassword: string; newPassword: string },
) => {
  const response = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await readResponseBody(response)
  if (!response.ok) {
    throw new Error(data?.error ?? 'Unable to update password right now.')
  }
}
