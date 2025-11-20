import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthUser } from './types'
import type { AuthResponse } from './authClient'
import {
  clearAuthStorage,
  fetchCurrentUser,
  getStoredAuth,
  loginAccount,
  logoutSession,
  persistAuth,
  refreshSession,
  registerAccount,
} from './authClient'

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type SignUpPayload = {
  email: string
  password: string
  displayName?: string
}

type SignInPayload = {
  email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  status: AuthStatus
  initializing: boolean
  error: string | null
  signUp: (payload: SignUpPayload) => Promise<void>
  signIn: (payload: SignInPayload) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const setSessionState = (
  payload: AuthResponse,
  setters: {
    setUser: (user: AuthUser | null) => void
    setAccessToken: (token: string | null) => void
    setRefreshToken: (token: string | null) => void
    setStatus: (status: AuthStatus) => void
    setError: (message: string | null) => void
  },
) => {
  setters.setUser(payload.user ?? null)
  setters.setAccessToken(payload.accessToken)
  setters.setRefreshToken(payload.refreshToken)
  setters.setStatus('authenticated')
  setters.setError(null)
  persistAuth(payload)
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [status, setStatus] = useState<AuthStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let cancelled = false
    const restoreSession = async () => {
      const stored = getStoredAuth()
      if (!stored?.accessToken || !stored.refreshToken) {
        if (!cancelled) {
          setStatus('unauthenticated')
          setInitializing(false)
        }
        return
      }

      setStatus('loading')
      try {
        const profile = await fetchCurrentUser(stored.accessToken)
        if (cancelled) return
        setSessionState(
          { ...stored, user: profile },
          { setUser, setAccessToken, setRefreshToken, setStatus, setError },
        )
      } catch (profileError) {
        if (cancelled) return
        try {
          const refreshed = await refreshSession(stored.refreshToken)
          if (cancelled) return
          setSessionState(refreshed, {
            setUser,
            setAccessToken,
            setRefreshToken,
            setStatus,
            setError,
          })
        } catch {
          clearAuthStorage()
          setUser(null)
          setAccessToken(null)
          setRefreshToken(null)
          setStatus('unauthenticated')
        }
      } finally {
        if (!cancelled) {
          setInitializing(false)
        }
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const applyAuthPayload = useCallback(
    (payload: AuthResponse) => {
      setSessionState(payload, { setUser, setAccessToken, setRefreshToken, setStatus, setError })
    },
    [setUser, setAccessToken, setRefreshToken, setStatus],
  )

  const resetSession = useCallback(() => {
    clearAuthStorage()
    setUser(null)
    setAccessToken(null)
    setRefreshToken(null)
    setStatus('unauthenticated')
    setError(null)
  }, [])

  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      setError(null)
      setStatus('loading')
      try {
        const response = await registerAccount(payload)
        applyAuthPayload(response)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to create account.'
        setError(message)
        setStatus(user ? 'authenticated' : 'unauthenticated')
        throw err
      }
    },
    [applyAuthPayload, user],
  )

  const signIn = useCallback(
    async (payload: SignInPayload) => {
      setError(null)
      setStatus('loading')
      try {
        const response = await loginAccount(payload)
        applyAuthPayload(response)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to sign in right now.'
        setError(message)
        setStatus(user ? 'authenticated' : 'unauthenticated')
        throw err
      }
    },
    [applyAuthPayload, user],
  )

  const signOut = useCallback(async () => {
    if (!refreshToken) {
      resetSession()
      return
    }
    setStatus('loading')
    try {
      await logoutSession(refreshToken)
    } finally {
      resetSession()
    }
  }, [refreshToken, resetSession])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      status,
      initializing,
      error,
      signUp,
      signIn,
      signOut,
      clearError,
    }),
    [
      accessToken,
      clearError,
      error,
      initializing,
      refreshToken,
      signIn,
      signOut,
      signUp,
      status,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
